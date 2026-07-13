import type { UUID } from '../../domain/types';
import { reviewRepository } from '../../repositories/repositoryFactory';
import {
  statisticsRepository,
  type StatisticsRepository,
} from '../statistics/statisticsRepository';
import { getReviewPeriod } from './reviewPeriod';
import type { ReviewRepository } from './reviewRepository';
import { buildReviewPreview } from './reviewService';
import type { Review, ReviewPreview, ReviewType } from './reviewTypes';

export class ReviewCoordinator {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly statistics: StatisticsRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}
  async preview(
    reviewType: ReviewType,
    anchor: string | number,
    timezone: string,
    includeDrafts = false,
  ): Promise<ReviewPreview> {
    const now = this.now();
    const [readings] = await Promise.all([
      this.statistics.listReadings(),
      this.statistics.listTopics(),
    ]);
    return buildReviewPreview(
      readings,
      getReviewPeriod(reviewType, anchor, timezone, now),
      includeDrafts,
      now,
    );
  }
  async create(preview: ReviewPreview, personalSummary: string | null): Promise<Review> {
    const now = this.now();
    return this.reviews.createReview({
      reviewType: preview.period.reviewType,
      periodStart: preview.period.periodStart,
      periodEnd: preview.period.periodEnd,
      timezone: preview.period.timezone,
      status: preview.period.isInProgress ? 'in_progress' : 'completed',
      includeDrafts: preview.includeDrafts,
      statisticsSnapshot: preview.snapshot,
      sourceReadingIds: preview.sourceReadingIds,
      sourceFingerprint: preview.sourceFingerprint,
      personalSummary,
      generatedAt: now,
    });
  }
  async hasSourceChanged(review: Review): Promise<boolean> {
    const preview = await this.preview(
      review.reviewType,
      review.periodStart,
      review.timezone,
      review.includeDrafts,
    );
    return preview.sourceFingerprint !== review.sourceFingerprint;
  }
  async regenerate(review: Review): Promise<Review> {
    const preview = await this.preview(
      review.reviewType,
      review.periodStart,
      review.timezone,
      review.includeDrafts,
    );
    return this.reviews.regenerateSnapshot(review.id, {
      status: preview.period.isInProgress ? 'in_progress' : 'completed',
      statisticsSnapshot: preview.snapshot,
      sourceReadingIds: preview.sourceReadingIds,
      sourceFingerprint: preview.sourceFingerprint,
      generatedAt: this.now(),
    });
  }
  getReview(id: UUID): Promise<Review | null> {
    return this.reviews.getReview(id);
  }
}

export const reviewCoordinator = new ReviewCoordinator(reviewRepository, statisticsRepository);
