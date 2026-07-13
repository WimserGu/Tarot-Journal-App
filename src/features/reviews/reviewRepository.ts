import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UUID } from '../../domain/types';
import {
  ConflictRepositoryError,
  NotFoundRepositoryError,
  ValidationRepositoryError,
} from '../../repositories/repositoryErrors';
import type {
  CreateReviewInput,
  RegenerateReviewInput,
  Review,
  ReviewListFilter,
  ReviewListItem,
  ReviewPeriodKey,
} from './reviewTypes';

export const REVIEW_SUMMARY_MAX_LENGTH = 5000;
export interface ReviewRepository {
  listReviews(filter?: ReviewListFilter): Promise<ReviewListItem[]>;
  getReview(id: UUID): Promise<Review | null>;
  getReviewForPeriod(input: ReviewPeriodKey): Promise<Review | null>;
  createReview(input: CreateReviewInput): Promise<Review>;
  updateSummary(id: UUID, summary: string | null): Promise<Review>;
  regenerateSnapshot(id: UUID, input: RegenerateReviewInput): Promise<Review>;
  deleteReview(id: UUID): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export interface ReviewStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
const STORAGE_KEY = '@tarot-journal/v1/reviews';
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
const normalizeSummary = (summary: string | null) => {
  if (summary !== null && summary.length > REVIEW_SUMMARY_MAX_LENGTH)
    throw new ValidationRepositoryError(
      `Summary must be ${REVIEW_SUMMARY_MAX_LENGTH} characters or fewer.`,
      'updateReviewSummary',
    );
  return summary === null || summary.trim().length === 0 ? null : summary;
};
const defaultId = () => `local-review-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export class LocalReviewRepository implements ReviewRepository {
  private reviews: Review[] = [];
  private readonly ready: Promise<void>;
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly storage: ReviewStorage = AsyncStorage,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly createId: () => UUID = defaultId,
  ) {
    this.ready = this.load();
  }
  private async load(): Promise<void> {
    try {
      const raw = await this.storage.getItem(STORAGE_KEY);
      if (raw === null) return;
      const value: unknown = JSON.parse(raw);
      if (Array.isArray(value)) this.reviews = value as Review[];
    } catch {
      this.reviews = [];
    }
  }
  private async persist(): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(this.reviews));
  }
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
  async listReviews(filter?: ReviewListFilter): Promise<ReviewListItem[]> {
    await this.ready;
    return this.reviews
      .filter((review) => !filter?.reviewType || review.reviewType === filter.reviewType)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
      .map(asListItem);
  }
  async getReview(id: UUID): Promise<Review | null> {
    await this.ready;
    return this.reviews.find((review) => review.id === id) ?? null;
  }
  async getReviewForPeriod(input: ReviewPeriodKey): Promise<Review | null> {
    await this.ready;
    return (
      this.reviews.find(
        (review) =>
          review.reviewType === input.reviewType &&
          review.periodStart === input.periodStart &&
          review.timezone === input.timezone,
      ) ?? null
    );
  }
  async createReview(input: CreateReviewInput): Promise<Review> {
    await this.ready;
    if (await this.getReviewForPeriod(input))
      throw new ConflictRepositoryError('A review already exists for this period.', 'createReview');
    const timestamp = this.now();
    const review: Review = {
      ...input,
      personalSummary: normalizeSummary(input.personalSummary),
      id: this.createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.reviews = [...this.reviews, review];
    await this.persist();
    this.notify();
    return review;
  }
  async updateSummary(id: UUID, summary: string | null): Promise<Review> {
    await this.ready;
    const review = await this.getReview(id);
    if (!review) throw new NotFoundRepositoryError('Review not found.', 'updateReviewSummary');
    const updated = {
      ...review,
      personalSummary: normalizeSummary(summary),
      updatedAt: this.now(),
    };
    this.reviews = this.reviews.map((item) => (item.id === id ? updated : item));
    await this.persist();
    this.notify();
    return updated;
  }
  async regenerateSnapshot(id: UUID, input: RegenerateReviewInput): Promise<Review> {
    await this.ready;
    const review = await this.getReview(id);
    if (!review) throw new NotFoundRepositoryError('Review not found.', 'regenerateReview');
    const updated = {
      ...review,
      ...input,
      personalSummary: review.personalSummary,
      updatedAt: this.now(),
    };
    this.reviews = this.reviews.map((item) => (item.id === id ? updated : item));
    await this.persist();
    this.notify();
    return updated;
  }
  async deleteReview(id: UUID): Promise<void> {
    await this.ready;
    if (!(await this.getReview(id)))
      throw new NotFoundRepositoryError('Review not found.', 'deleteReview');
    this.reviews = this.reviews.filter((review) => review.id !== id);
    await this.persist();
    this.notify();
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const localReviewRepository = new LocalReviewRepository();
