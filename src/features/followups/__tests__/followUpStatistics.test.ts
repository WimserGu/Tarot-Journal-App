import { describe, expect, it } from 'vitest';
import type { FollowUpOutcome, ReadingFollowUp } from '../../../domain/types';
import { calculateOutcomeDistribution } from '../followUpStatistics';

const completed = (id: string, readingId: string, outcome: FollowUpOutcome): ReadingFollowUp => ({
  id,
  readingId,
  outcome,
  status: 'completed',
  scheduledFor: '2026-07-01T00:00:00.000Z',
  reviewedAt: '2026-07-02T00:00:00.000Z',
  reflection: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
});

describe('Follow-Up outcome distribution', () => {
  it('counts all four neutral categories', () => {
    const result = calculateOutcomeDistribution([
      completed('a', 'r1', 'happened'),
      completed('b', 'r2', 'partly_happened'),
      completed('c', 'r3', 'did_not_happen'),
      completed('d', 'r4', 'still_unclear'),
    ]);
    expect(result.completedCount).toBe(4);
    expect(Object.values(result.items).map((item) => item.count)).toEqual([1, 1, 1, 1]);
  });
  it('excludes scheduled reminders', () => {
    const scheduled: ReadingFollowUp = {
      ...completed('a', 'r1', 'happened'),
      status: 'scheduled',
      outcome: null,
      reviewedAt: null,
    };
    expect(calculateOutcomeDistribution([scheduled]).completedCount).toBe(0);
  });
  it('returns finite zero ratios for no records', () => {
    expect(
      Object.values(calculateOutcomeDistribution([]).items).every(
        (item) => item.ratio === 0 && Number.isFinite(item.ratio),
      ),
    ).toBe(true);
  });
  it('counts multiple real follow-ups for the same Reading separately', () => {
    const result = calculateOutcomeDistribution([
      completed('a', 'r1', 'happened'),
      completed('b', 'r1', 'still_unclear'),
    ]);
    expect(result.completedCount).toBe(2);
  });
  it('returns source Follow-Up and unique Reading IDs', () => {
    const item = calculateOutcomeDistribution([
      completed('a', 'r1', 'happened'),
      completed('b', 'r1', 'happened'),
    ]).items.happened;
    expect(item.followUpIds).toEqual(['a', 'b']);
    expect(item.readingIds).toEqual(['r1']);
  });
  it('does not expose an accuracy field', () => {
    expect(calculateOutcomeDistribution([])).not.toHaveProperty('accuracy');
  });
});
