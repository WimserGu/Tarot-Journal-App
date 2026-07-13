import type { SupabaseClient } from '@supabase/supabase-js';
import type { UUID } from '../../domain/types';
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
import { mapReviewRow, toReviewInsertRow } from './reviewMapper';
import { REVIEW_SUMMARY_MAX_LENGTH, type ReviewRepository } from './reviewRepository';
import type {
  CreateReviewInput,
  RegenerateReviewInput,
  Review,
  ReviewListFilter,
  ReviewListItem,
  ReviewPeriodKey,
} from './reviewTypes';

type DbError = { code?: string; message?: string } | null;
function mapError(error: DbError, operation: string): RepositoryError {
  if (!error) return new UnknownRepositoryError(operation);
  if (error.code === '42501' || /permission|row-level security/i.test(error.message ?? ''))
    return new ForbiddenRepositoryError(operation);
  if (error.code === '23505')
    return new ConflictRepositoryError('A review already exists for this period.', operation);
  if (error.code === '22023' || error.code === '23514')
    return new ValidationRepositoryError('The review contains invalid data.', operation);
  if (/fetch|network|timeout/i.test(error.message ?? ''))
    return new NetworkRepositoryError(operation);
  return new UnknownRepositoryError(operation);
}
const asListItem = (review: Review): ReviewListItem => ({
  id: review.id,
  reviewType: review.reviewType,
  periodStart: review.periodStart,
  periodEnd: review.periodEnd,
  timezone: review.timezone,
  status: review.status,
  sourceReadingIds: review.sourceReadingIds,
  generatedAt: review.generatedAt,
  updatedAt: review.updatedAt,
  readingCount: review.statisticsSnapshot.current.readingCount.count,
  cardCount: review.statisticsSnapshot.current.cardCount.count,
});
function summary(value: string | null): string | null {
  if (value !== null && value.length > REVIEW_SUMMARY_MAX_LENGTH)
    throw new ValidationRepositoryError(
      `Summary must be ${REVIEW_SUMMARY_MAX_LENGTH} characters or fewer.`,
      'reviewSummary',
    );
  return value === null || value.trim().length === 0 ? null : value;
}

export class SupabaseReviewRepository implements ReviewRepository {
  private readonly listeners = new Set<() => void>();
  constructor(private readonly client: SupabaseClient) {}
  private async requireUser(): Promise<UUID> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new UnauthorizedRepositoryError('reviews.auth');
    return data.user.id;
  }
  private check(error: DbError, operation: string): void {
    if (error) throw mapError(error, operation);
  }
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
  async listReviews(filter?: ReviewListFilter): Promise<ReviewListItem[]> {
    await this.requireUser();
    let query = this.client.from('reviews').select('*').order('period_start', { ascending: false });
    if (filter?.reviewType) query = query.eq('review_type', filter.reviewType);
    const { data, error } = await query;
    this.check(error, 'listReviews');
    return (data ?? []).map((row) => asListItem(mapReviewRow(row as Record<string, unknown>)));
  }
  async getReview(id: UUID): Promise<Review | null> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    this.check(error, 'getReview');
    return data ? mapReviewRow(data as Record<string, unknown>) : null;
  }
  async getReviewForPeriod(input: ReviewPeriodKey): Promise<Review | null> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('review_type', input.reviewType)
      .eq('period_start', input.periodStart)
      .eq('timezone', input.timezone)
      .maybeSingle();
    this.check(error, 'getReviewForPeriod');
    return data ? mapReviewRow(data as Record<string, unknown>) : null;
  }
  async createReview(input: CreateReviewInput): Promise<Review> {
    const userId = await this.requireUser();
    const { data, error } = await this.client
      .from('reviews')
      .insert({
        ...toReviewInsertRow({ ...input, personalSummary: summary(input.personalSummary) }),
        user_id: userId,
      })
      .select('*')
      .single();
    this.check(error, 'createReview');
    const review = mapReviewRow(data as Record<string, unknown>);
    this.notify();
    return review;
  }
  async updateSummary(id: UUID, value: string | null): Promise<Review> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reviews')
      .update({ personal_summary: summary(value) })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    this.check(error, 'updateReviewSummary');
    if (!data) throw new NotFoundRepositoryError('Review not found.', 'updateReviewSummary');
    const review = mapReviewRow(data as Record<string, unknown>);
    this.notify();
    return review;
  }
  async regenerateSnapshot(id: UUID, input: RegenerateReviewInput): Promise<Review> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('reviews')
      .update({
        status: input.status,
        statistics_snapshot: input.statisticsSnapshot,
        source_reading_ids: input.sourceReadingIds,
        source_fingerprint: input.sourceFingerprint,
        generated_at: input.generatedAt,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    this.check(error, 'regenerateReview');
    if (!data) throw new NotFoundRepositoryError('Review not found.', 'regenerateReview');
    const review = mapReviewRow(data as Record<string, unknown>);
    this.notify();
    return review;
  }
  async deleteReview(id: UUID): Promise<void> {
    await this.requireUser();
    const existing = await this.getReview(id);
    if (!existing) throw new NotFoundRepositoryError('Review not found.', 'deleteReview');
    const { error } = await this.client.from('reviews').delete().eq('id', id);
    this.check(error, 'deleteReview');
    this.notify();
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
