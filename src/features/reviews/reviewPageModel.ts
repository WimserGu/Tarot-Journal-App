import type { ReviewPeriod, ReviewType } from './reviewTypes';

export type ReviewPageState = 'loading' | 'error' | 'empty' | 'content';
export function getReviewPageState(
  loading: boolean,
  error: string | null,
  readingCount: number,
): ReviewPageState {
  if (loading) return 'loading';
  if (error) return 'error';
  return readingCount === 0 ? 'empty' : 'content';
}
export function reviewTypeLabel(type: ReviewType): string {
  return type === 'weekly' ? 'Weekly' : 'Monthly';
}
export function canSubmitReview(
  submitting: boolean,
  hasPreview: boolean,
  hasExisting: boolean,
): boolean {
  return !submitting && hasPreview && !hasExisting;
}
export function periodStatusLabel(period: ReviewPeriod): string {
  return period.isInProgress ? '当前周期进行中' : '完整历史周期';
}
