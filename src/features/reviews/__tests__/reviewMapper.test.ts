import { describe, expect, it } from 'vitest';
import { ValidationRepositoryError } from '../../../repositories/repositoryErrors';
import { getReviewPeriod } from '../reviewPeriod';
import { mapReviewRow, toReviewInsertRow } from '../reviewMapper';
import { buildReviewPreview } from '../reviewService';

const now = '2026-07-16T18:00:00.000Z';
const period = getReviewPeriod('weekly', now, 'UTC', now);
const preview = buildReviewPreview([], period, false, now);
const row = {
  id: 'review',
  user_id: 'user',
  review_type: 'weekly',
  period_start: period.periodStart,
  period_end: period.periodEnd,
  timezone: 'UTC',
  status: 'in_progress',
  include_drafts: false,
  statistics_snapshot: preview.snapshot,
  source_reading_ids: [],
  source_fingerprint: preview.sourceFingerprint,
  personal_summary: null,
  generated_at: now,
  created_at: now,
  updated_at: now,
};

describe('review mapper', () => {
  it('maps snake_case rows to the stable domain model', () => {
    expect(mapReviewRow(row)).toMatchObject({
      id: 'review',
      reviewType: 'weekly',
      periodStart: period.periodStart,
      personalSummary: null,
    });
  });
  it('maps create input back to database field names without user_id', () => {
    const domain = mapReviewRow(row);
    const result = toReviewInsertRow(domain);
    expect(result).toMatchObject({ review_type: 'weekly', statistics_snapshot: preview.snapshot });
    expect(result).not.toHaveProperty('user_id');
  });
  it.each([
    { ...row, review_type: 'annual' },
    { ...row, period_start: 'not-a-date' },
    { ...row, source_reading_ids: [1] },
    { ...row, statistics_snapshot: { ...preview.snapshot, unknown: true } },
    {
      ...row,
      statistics_snapshot: {
        ...preview.snapshot,
        current: { ...preview.snapshot.current, unknown: true },
      },
    },
  ])('rejects unknown enum, date, trace or snapshot structures', (value) => {
    expect(() => mapReviewRow(value)).toThrow(ValidationRepositoryError);
  });
});
