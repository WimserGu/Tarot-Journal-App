import { describe, expect, it } from 'vitest';
import { getReviewPeriod } from '../reviewPeriod';
import {
  canSubmitReview,
  getReviewPageState,
  periodStatusLabel,
  reviewTypeLabel,
} from '../reviewPageModel';
import { reviewDetailRoute, signedDelta } from '../reviewPresentation';

describe('Review page model', () => {
  it.each([
    [true, null, 0, 'loading'],
    [false, 'error', 0, 'error'],
    [false, null, 0, 'empty'],
    [false, null, 1, 'content'],
  ] as const)('maps loading/error/empty/content state', (loading, error, count, expected) =>
    expect(getReviewPageState(loading, error, count)).toBe(expected),
  );
  it('supports Weekly/Monthly labels and duplicate-submit guard', () => {
    expect(reviewTypeLabel('weekly')).toBe('Weekly');
    expect(reviewTypeLabel('monthly')).toBe('Monthly');
    expect(canSubmitReview(false, true, false)).toBe(true);
    expect(canSubmitReview(true, true, false)).toBe(false);
    expect(canSubmitReview(false, true, true)).toBe(false);
  });
  it('labels current periods and signed factual changes', () => {
    const period = getReviewPeriod('weekly', '2026-07-15T00:00:00Z', 'UTC', '2026-07-16T00:00:00Z');
    expect(periodStatusLabel(period)).toBe('当前周期进行中');
    expect(signedDelta(2)).toBe('增加 +2');
    expect(signedDelta(-1)).toBe('减少 -1');
  });
  it('builds Reading-independent Review detail navigation', () => {
    expect(reviewDetailRoute('review')).toBe('/reviews/review');
  });
});
