import type { FollowUpOutcome, ISODateTime, ReadingFollowUp, UUID } from '../../domain/types';
import {
  ConflictRepositoryError,
  NotFoundRepositoryError,
  ValidationRepositoryError,
} from '../../repositories/repositoryErrors';
import { JournalStore, journalStore } from '../../repositories/mockJournalStore';
import { buildReadingDetail } from '../readings/readingRepository';
import { getFollowUpDueState } from './followUpDate';
import type {
  CompleteFollowUpInput,
  CreateFollowUpInput,
  FollowUpListFilter,
  FollowUpPendingFilter,
  ReadingFollowUpDetail,
  ReadingFollowUpListItem,
  UpdateFollowUpInput,
} from './followUpTypes';

export const FOLLOW_UP_REFLECTION_MAX_LENGTH = 5000;
const outcomes: FollowUpOutcome[] = [
  'happened',
  'partly_happened',
  'did_not_happen',
  'still_unclear',
];

export interface FollowUpRepository {
  listForReading(readingId: UUID): Promise<ReadingFollowUp[]>;
  listFollowUps(filter?: FollowUpListFilter): Promise<ReadingFollowUpListItem[]>;
  listPending(filter?: FollowUpPendingFilter): Promise<ReadingFollowUpListItem[]>;
  getFollowUp(id: UUID): Promise<ReadingFollowUpDetail | null>;
  createFollowUp(input: CreateFollowUpInput): Promise<ReadingFollowUp>;
  updateFollowUp(id: UUID, input: UpdateFollowUpInput): Promise<ReadingFollowUp>;
  completeFollowUp(id: UUID, input: CompleteFollowUpInput): Promise<ReadingFollowUp>;
  snoozeFollowUp(id: UUID, scheduledFor: ISODateTime): Promise<ReadingFollowUp>;
  deleteFollowUp(id: UUID): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export function normalizeReflection(value: string | null): string | null {
  if (value !== null && value.length > FOLLOW_UP_REFLECTION_MAX_LENGTH)
    throw new ValidationRepositoryError(
      `Reflection must be ${FOLLOW_UP_REFLECTION_MAX_LENGTH} characters or fewer.`,
      'followUpReflection',
    );
  return value === null || value.trim().length === 0 ? null : value;
}

function validIso(value: string, operation: string): string {
  if (Number.isNaN(Date.parse(value)))
    throw new ValidationRepositoryError('Choose a valid follow-up date.', operation);
  return value;
}

function requireOutcome(value: string): FollowUpOutcome {
  if (!outcomes.includes(value as FollowUpOutcome))
    throw new ValidationRepositoryError('Choose a valid outcome.', 'completeFollowUp');
  return value as FollowUpOutcome;
}

function sortMoment(followUp: ReadingFollowUp): string {
  return followUp.reviewedAt ?? followUp.scheduledFor;
}

export class LocalFollowUpRepository implements FollowUpRepository {
  constructor(
    private readonly store: JournalStore = journalStore,
    private readonly timezone: () => string = () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  ) {}

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async listForReading(readingId: UUID): Promise<ReadingFollowUp[]> {
    await this.store.ready();
    return this.store
      .snapshot()
      .reading_follow_ups.filter((followUp) => followUp.readingId === readingId)
      .sort((a, b) => sortMoment(b).localeCompare(sortMoment(a)));
  }

  private listItem(
    followUp: ReadingFollowUp,
    now: ISODateTime,
    timezone: string,
  ): ReadingFollowUpListItem | null {
    const detail = buildReadingDetail(this.store.snapshot(), this.store.userId, followUp.readingId);
    return detail
      ? {
          followUp,
          questionText: detail.question_text,
          readingAt: detail.reading.reading_at,
          readingTimezone: detail.reading.reading_timezone,
          dueState: getFollowUpDueState(followUp, now, timezone),
        }
      : null;
  }

  async listFollowUps(filter: FollowUpListFilter = {}): Promise<ReadingFollowUpListItem[]> {
    await this.store.ready();
    const now = this.store.now();
    const timezone = this.timezone();
    return this.store
      .snapshot()
      .reading_follow_ups.filter((followUp) => !filter.status || followUp.status === filter.status)
      .flatMap((followUp) => {
        const item = this.listItem(followUp, now, timezone);
        return item ? [item] : [];
      })
      .sort((a, b) => sortMoment(b.followUp).localeCompare(sortMoment(a.followUp)));
  }

  async listPending(filter: FollowUpPendingFilter = {}): Promise<ReadingFollowUpListItem[]> {
    await this.store.ready();
    const now = filter.now ?? this.store.now();
    const timezone = filter.timezone ?? this.timezone();
    const rank = { overdue: 0, due_today: 1, upcoming: 2, completed: 3 } as const;
    return this.store
      .snapshot()
      .reading_follow_ups.filter((followUp) => followUp.status === 'scheduled')
      .flatMap((followUp) => {
        const item = this.listItem(followUp, now, timezone);
        return item ? [item] : [];
      })
      .sort(
        (a, b) =>
          rank[a.dueState] - rank[b.dueState] ||
          a.followUp.scheduledFor.localeCompare(b.followUp.scheduledFor) ||
          a.followUp.id.localeCompare(b.followUp.id),
      )
      .slice(0, filter.limit);
  }

  async getFollowUp(id: UUID): Promise<ReadingFollowUpDetail | null> {
    await this.store.ready();
    const followUp = this.store.snapshot().reading_follow_ups.find((item) => item.id === id);
    if (!followUp) return null;
    const reading = buildReadingDetail(
      this.store.snapshot(),
      this.store.userId,
      followUp.readingId,
    );
    return reading ? { followUp, reading } : null;
  }

  async createFollowUp(input: CreateFollowUpInput): Promise<ReadingFollowUp> {
    await this.store.ready();
    const reading = buildReadingDetail(this.store.snapshot(), this.store.userId, input.readingId);
    if (!reading) throw new NotFoundRepositoryError('Reading not found.', 'createFollowUp');
    const scheduledFor = validIso(input.scheduledFor, 'createFollowUp');
    if (Date.parse(scheduledFor) < Date.parse(reading.reading.reading_at))
      throw new ValidationRepositoryError(
        'The follow-up date cannot be before the Reading.',
        'createFollowUp',
      );
    if (
      this.store
        .snapshot()
        .reading_follow_ups.some(
          (item) =>
            item.readingId === input.readingId &&
            item.status === 'scheduled' &&
            item.scheduledFor === scheduledFor,
        )
    )
      throw new ConflictRepositoryError(
        'A pending follow-up already exists for this date.',
        'createFollowUp',
      );
    const now = this.store.now();
    const followUp: ReadingFollowUp = {
      id: this.store.createId('reading-follow-up'),
      readingId: input.readingId,
      scheduledFor,
      reviewedAt: null,
      status: 'scheduled',
      outcome: null,
      reflection: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.mutate((data) => data.reading_follow_ups.push(followUp));
    return followUp;
  }

  async updateFollowUp(id: UUID, input: UpdateFollowUpInput): Promise<ReadingFollowUp> {
    const detail = await this.getFollowUp(id);
    const current = detail?.followUp;
    if (!current || !detail)
      throw new NotFoundRepositoryError('Follow-up not found.', 'updateFollowUp');
    let updated: ReadingFollowUp;
    if (current.status === 'scheduled') {
      if (input.outcome !== undefined || input.reflection !== undefined)
        throw new ValidationRepositoryError(
          'Complete the follow-up before recording an outcome.',
          'updateFollowUp',
        );
      updated = {
        ...current,
        scheduledFor:
          input.scheduledFor === undefined
            ? current.scheduledFor
            : validIso(input.scheduledFor, 'updateFollowUp'),
        updatedAt: this.store.now(),
      };
      if (Date.parse(updated.scheduledFor) < Date.parse(detail.reading.reading.reading_at))
        throw new ValidationRepositoryError(
          'The follow-up date cannot be before the Reading.',
          'updateFollowUp',
        );
      if (
        this.store
          .snapshot()
          .reading_follow_ups.some(
            (item) =>
              item.id !== id &&
              item.readingId === current.readingId &&
              item.status === 'scheduled' &&
              item.scheduledFor === updated.scheduledFor,
          )
      )
        throw new ConflictRepositoryError(
          'A pending follow-up already exists for this date.',
          'updateFollowUp',
        );
    } else {
      if (input.scheduledFor !== undefined)
        throw new ValidationRepositoryError(
          'A completed follow-up keeps its planned date.',
          'updateFollowUp',
        );
      updated = {
        ...current,
        outcome: input.outcome === undefined ? current.outcome : requireOutcome(input.outcome),
        reflection:
          input.reflection === undefined
            ? current.reflection
            : normalizeReflection(input.reflection),
        updatedAt: this.store.now(),
      };
    }
    await this.store.mutate((data) => {
      data.reading_follow_ups = data.reading_follow_ups.map((item) =>
        item.id === id ? updated : item,
      );
    });
    return updated;
  }

  async completeFollowUp(id: UUID, input: CompleteFollowUpInput): Promise<ReadingFollowUp> {
    const current = (await this.getFollowUp(id))?.followUp;
    if (!current) throw new NotFoundRepositoryError('Follow-up not found.', 'completeFollowUp');
    const updated: ReadingFollowUp = {
      ...current,
      status: 'completed',
      outcome: requireOutcome(input.outcome),
      reflection: normalizeReflection(input.reflection),
      reviewedAt: validIso(input.reviewedAt, 'completeFollowUp'),
      updatedAt: this.store.now(),
    };
    await this.store.mutate((data) => {
      data.reading_follow_ups = data.reading_follow_ups.map((item) =>
        item.id === id ? updated : item,
      );
    });
    return updated;
  }

  async snoozeFollowUp(id: UUID, scheduledFor: ISODateTime): Promise<ReadingFollowUp> {
    const current = (await this.getFollowUp(id))?.followUp;
    if (!current) throw new NotFoundRepositoryError('Follow-up not found.', 'snoozeFollowUp');
    if (current.status !== 'scheduled')
      throw new ValidationRepositoryError(
        'Only pending follow-ups can be postponed.',
        'snoozeFollowUp',
      );
    return this.updateFollowUp(id, { scheduledFor });
  }

  async deleteFollowUp(id: UUID): Promise<void> {
    if (!(await this.getFollowUp(id)))
      throw new NotFoundRepositoryError('Follow-up not found.', 'deleteFollowUp');
    await this.store.mutate((data) => {
      data.reading_follow_ups = data.reading_follow_ups.filter((item) => item.id !== id);
    });
  }
}

export const localFollowUpRepository = new LocalFollowUpRepository();
