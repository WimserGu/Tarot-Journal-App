import type { SupabaseClient } from '@supabase/supabase-js';
import type { ISODateTime, ReadingFollowUp, UUID } from '../../domain/types';
import {
  ConflictRepositoryError,
  ForbiddenRepositoryError,
  NetworkRepositoryError,
  NotFoundRepositoryError,
  RepositoryError,
  UnauthorizedRepositoryError,
  UnknownRepositoryError,
  ValidationRepositoryError,
} from '../../repositories/repositoryErrors';
import type { ReadingRepository } from '../readings/readingRepository';
import { getFollowUpDueState } from './followUpDate';
import { mapFollowUpRow, toFollowUpInsertRow, toFollowUpUpdateRow } from './followUpMapper';
import { normalizeReflection, type FollowUpRepository } from './followUpRepository';
import type {
  CompleteFollowUpInput,
  CreateFollowUpInput,
  FollowUpListFilter,
  FollowUpPendingFilter,
  ReadingFollowUpDetail,
  ReadingFollowUpListItem,
  UpdateFollowUpInput,
} from './followUpTypes';

const outcomes = ['happened', 'partly_happened', 'did_not_happen', 'still_unclear'] as const;

type DbError = { code?: string; message?: string } | null;
function mapError(error: DbError, operation: string): RepositoryError {
  if (!error) return new UnknownRepositoryError(operation);
  if (error.code === '42501' || /permission|row-level security/i.test(error.message ?? ''))
    return new ForbiddenRepositoryError(operation);
  if (error.code === '23505')
    return new ConflictRepositoryError(
      'A pending follow-up already exists for this date.',
      operation,
    );
  if (error.code === '23503') return new NotFoundRepositoryError('Reading not found.', operation);
  if (error.code === '22023' || error.code === '23514')
    return new ValidationRepositoryError('The follow-up contains invalid data.', operation);
  if (/fetch|network|timeout/i.test(error.message ?? ''))
    return new NetworkRepositoryError(operation);
  return new UnknownRepositoryError(operation);
}

export class SupabaseFollowUpRepository implements FollowUpRepository {
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly client: SupabaseClient,
    private readonly readings: ReadingRepository,
    private readonly now: () => ISODateTime = () => new Date().toISOString(),
    private readonly timezone: () => string = () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  ) {}

  private async requireUser(): Promise<UUID> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new UnauthorizedRepositoryError('followUps.auth');
    return data.user.id;
  }
  private check(error: DbError, operation: string): void {
    if (error) throw mapError(error, operation);
  }
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async listItems(
    followUps: ReadingFollowUp[],
    now: ISODateTime,
    timezone: string,
  ): Promise<ReadingFollowUpListItem[]> {
    return (
      await Promise.all(
        followUps.map(async (followUp) => {
          const detail = await this.readings.getReadingDetail(followUp.readingId);
          return detail
            ? {
                followUp,
                questionText: detail.question_text,
                readingAt: detail.reading.reading_at,
                readingTimezone: detail.reading.reading_timezone,
                dueState: getFollowUpDueState(followUp, now, timezone),
              }
            : null;
        }),
      )
    ).filter((item): item is ReadingFollowUpListItem => item !== null);
  }

  async listForReading(readingId: UUID): Promise<ReadingFollowUp[]> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reading_follow_ups')
      .select('*')
      .eq('reading_id', readingId)
      .order('scheduled_for', { ascending: false });
    this.check(error, 'listFollowUpsForReading');
    return (data ?? []).map((row) => mapFollowUpRow(row as Record<string, unknown>));
  }

  async listFollowUps(filter: FollowUpListFilter = {}): Promise<ReadingFollowUpListItem[]> {
    await this.requireUser();
    let query = this.client
      .from('reading_follow_ups')
      .select('*')
      .order('scheduled_for', { ascending: false });
    if (filter.status) query = query.eq('status', filter.status);
    const { data, error } = await query;
    this.check(error, 'listFollowUps');
    return this.listItems(
      (data ?? []).map((row) => mapFollowUpRow(row as Record<string, unknown>)),
      this.now(),
      this.timezone(),
    );
  }

  async listPending(filter: FollowUpPendingFilter = {}): Promise<ReadingFollowUpListItem[]> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reading_follow_ups')
      .select('*')
      .eq('status', 'scheduled')
      .order('scheduled_for', { ascending: true });
    this.check(error, 'listPendingFollowUps');
    const rank = { overdue: 0, due_today: 1, upcoming: 2, completed: 3 } as const;
    const items = await this.listItems(
      (data ?? []).map((row) => mapFollowUpRow(row as Record<string, unknown>)),
      filter.now ?? this.now(),
      filter.timezone ?? this.timezone(),
    );
    return items
      .sort(
        (a, b) =>
          rank[a.dueState] - rank[b.dueState] ||
          a.followUp.scheduledFor.localeCompare(b.followUp.scheduledFor) ||
          a.followUp.id.localeCompare(b.followUp.id),
      )
      .slice(0, filter.limit);
  }

  async getFollowUp(id: UUID): Promise<ReadingFollowUpDetail | null> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reading_follow_ups')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    this.check(error, 'getFollowUp');
    if (!data) return null;
    const followUp = mapFollowUpRow(data as Record<string, unknown>);
    const reading = await this.readings.getReadingDetail(followUp.readingId);
    return reading ? { followUp, reading } : null;
  }

  async createFollowUp(input: CreateFollowUpInput): Promise<ReadingFollowUp> {
    await this.requireUser();
    if (Number.isNaN(Date.parse(input.scheduledFor)))
      throw new ValidationRepositoryError('Choose a valid follow-up date.', 'createFollowUp');
    const reading = await this.readings.getReadingDetail(input.readingId);
    if (!reading) throw new NotFoundRepositoryError('Reading not found.', 'createFollowUp');
    if (Date.parse(input.scheduledFor) < Date.parse(reading.reading.reading_at))
      throw new ValidationRepositoryError(
        'The follow-up date cannot be before the Reading.',
        'createFollowUp',
      );
    const { data, error } = await this.client
      .from('reading_follow_ups')
      .insert(toFollowUpInsertRow(input))
      .select('*')
      .single();
    this.check(error, 'createFollowUp');
    const followUp = mapFollowUpRow(data as Record<string, unknown>);
    this.notify();
    return followUp;
  }

  private async updateRow(id: UUID, payload: Record<string, unknown>, operation: string) {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reading_follow_ups')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    this.check(error, operation);
    if (!data) throw new NotFoundRepositoryError('Follow-up not found.', operation);
    const followUp = mapFollowUpRow(data as Record<string, unknown>);
    this.notify();
    return followUp;
  }

  async updateFollowUp(id: UUID, input: UpdateFollowUpInput): Promise<ReadingFollowUp> {
    const detail = await this.getFollowUp(id);
    const current = detail?.followUp;
    if (!current || !detail)
      throw new NotFoundRepositoryError('Follow-up not found.', 'updateFollowUp');
    if (
      current.status === 'scheduled' &&
      (input.outcome !== undefined || input.reflection !== undefined)
    )
      throw new ValidationRepositoryError(
        'Complete the follow-up before recording an outcome.',
        'updateFollowUp',
      );
    if (current.status === 'completed' && input.scheduledFor !== undefined)
      throw new ValidationRepositoryError(
        'A completed follow-up keeps its planned date.',
        'updateFollowUp',
      );
    if (input.reflection !== undefined) normalizeReflection(input.reflection);
    if (
      input.scheduledFor !== undefined &&
      Date.parse(input.scheduledFor) < Date.parse(detail.reading.reading.reading_at)
    )
      throw new ValidationRepositoryError(
        'The follow-up date cannot be before the Reading.',
        'updateFollowUp',
      );
    return this.updateRow(id, toFollowUpUpdateRow(input), 'updateFollowUp');
  }

  async completeFollowUp(id: UUID, input: CompleteFollowUpInput): Promise<ReadingFollowUp> {
    if (Number.isNaN(Date.parse(input.reviewedAt)))
      throw new ValidationRepositoryError('Invalid review time.', 'completeFollowUp');
    if (!outcomes.includes(input.outcome))
      throw new ValidationRepositoryError('Choose a valid outcome.', 'completeFollowUp');
    const reflection = normalizeReflection(input.reflection);
    return this.updateRow(
      id,
      {
        status: 'completed',
        outcome: input.outcome,
        reflection,
        reviewed_at: input.reviewedAt,
      },
      'completeFollowUp',
    );
  }

  async snoozeFollowUp(id: UUID, scheduledFor: ISODateTime): Promise<ReadingFollowUp> {
    const current = (await this.getFollowUp(id))?.followUp;
    if (!current) throw new NotFoundRepositoryError('Follow-up not found.', 'snoozeFollowUp');
    if (current.status !== 'scheduled')
      throw new ValidationRepositoryError(
        'Only pending follow-ups can be postponed.',
        'snoozeFollowUp',
      );
    return this.updateRow(
      id,
      { scheduled_for: scheduledFor, reviewed_at: null, outcome: null, reflection: null },
      'snoozeFollowUp',
    );
  }

  async deleteFollowUp(id: UUID): Promise<void> {
    await this.requireUser();
    if (!(await this.getFollowUp(id)))
      throw new NotFoundRepositoryError('Follow-up not found.', 'deleteFollowUp');
    const { error } = await this.client.from('reading_follow_ups').delete().eq('id', id);
    this.check(error, 'deleteFollowUp');
    this.notify();
  }
}
