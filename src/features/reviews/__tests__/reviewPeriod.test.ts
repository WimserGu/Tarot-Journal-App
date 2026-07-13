import { describe, expect, it } from 'vitest';
import { ValidationRepositoryError } from '../../../repositories/repositoryErrors';
import { getReviewPeriod, reviewPeriodAnchorDate, shiftReviewPeriod } from '../reviewPeriod';

describe('review period utilities', () => {
  it('starts a normal week on local Monday and uses [start, end)', () => {
    const value = getReviewPeriod('weekly', '2026-07-15T12:00:00Z', 'UTC', '2026-07-16T00:00:00Z');
    expect(value).toMatchObject({
      periodStart: '2026-07-13T00:00:00.000Z',
      periodEnd: '2026-07-20T00:00:00.000Z',
      previousPeriodStart: '2026-07-06T00:00:00.000Z',
      previousPeriodEnd: '2026-07-13T00:00:00.000Z',
      isInProgress: true,
    });
  });
  it('keeps a cross-month week intact', () => {
    expect(
      getReviewPeriod('weekly', '2026-04-01T12:00:00Z', 'UTC', '2026-04-02T00:00:00Z'),
    ).toMatchObject({
      periodStart: '2026-03-30T00:00:00.000Z',
      periodEnd: '2026-04-06T00:00:00.000Z',
    });
  });
  it('keeps a cross-year week intact', () => {
    expect(
      getReviewPeriod('weekly', '2026-01-01T12:00:00Z', 'UTC', '2026-01-02T00:00:00Z'),
    ).toMatchObject({
      periodStart: '2025-12-29T00:00:00.000Z',
      periodEnd: '2026-01-05T00:00:00.000Z',
    });
  });
  it('uses natural calendar months', () => {
    expect(
      getReviewPeriod('monthly', '2026-04-20T12:00:00Z', 'UTC', '2026-04-21T00:00:00Z'),
    ).toMatchObject({
      periodStart: '2026-04-01T00:00:00.000Z',
      periodEnd: '2026-05-01T00:00:00.000Z',
      previousPeriodStart: '2026-03-01T00:00:00.000Z',
    });
  });
  it('handles leap-year February', () => {
    expect(
      getReviewPeriod('monthly', '2028-02-20T12:00:00Z', 'UTC', '2028-02-21T00:00:00Z'),
    ).toMatchObject({
      periodStart: '2028-02-01T00:00:00.000Z',
      periodEnd: '2028-03-01T00:00:00.000Z',
    });
  });
  it('uses IANA offsets rather than UTC midnight', () => {
    expect(
      getReviewPeriod('monthly', '2026-07-12T12:00:00Z', 'Asia/Shanghai', '2026-07-13T00:00:00Z')
        .periodStart,
    ).toBe('2026-06-30T16:00:00.000Z');
  });
  it('accounts for DST so a spring-forward week is 167 hours', () => {
    const value = getReviewPeriod(
      'weekly',
      '2026-03-04T12:00:00Z',
      'America/New_York',
      '2026-03-05T00:00:00Z',
    );
    expect((Date.parse(value.periodEnd) - Date.parse(value.periodStart)) / 3_600_000).toBe(167);
  });
  it('navigates to previous week and month', () => {
    const week = getReviewPeriod('weekly', '2026-07-15T12:00:00Z', 'UTC', '2026-07-16T00:00:00Z');
    expect(shiftReviewPeriod(week, -1, '2026-07-16T00:00:00Z').periodStart).toBe(
      '2026-07-06T00:00:00.000Z',
    );
    const month = getReviewPeriod('monthly', '2026-03-15T12:00:00Z', 'UTC', '2026-03-16T00:00:00Z');
    expect(shiftReviewPeriod(month, -1, '2026-03-16T00:00:00Z').periodStart).toBe(
      '2026-02-01T00:00:00.000Z',
    );
  });
  it('returns the local calendar anchor instead of the UTC date', () => {
    const value = getReviewPeriod(
      'weekly',
      '2026-07-15T12:00:00Z',
      'Africa/Nairobi',
      '2026-07-16T00:00:00Z',
    );
    expect(reviewPeriodAnchorDate(value)).toBe('2026-07-13');
    expect(reviewPeriodAnchorDate(shiftReviewPeriod(value, -1, '2026-07-16T00:00:00Z'))).toBe(
      '2026-07-06',
    );
  });
  it('rejects future periods and invalid timezones', () => {
    expect(() =>
      getReviewPeriod('weekly', '2027-01-01T00:00:00Z', 'UTC', '2026-01-01T00:00:00Z'),
    ).toThrow(ValidationRepositoryError);
    expect(() => getReviewPeriod('weekly', 0, 'Mars/Olympus', 0)).toThrow(
      ValidationRepositoryError,
    );
  });
});
