import { describe, expect, it } from 'vitest';
import { ValidationRepositoryError } from '../../../repositories/repositoryErrors';
import {
  addFollowUpCalendarDays,
  customFollowUpDate,
  followUpDateInputValue,
  getFollowUpDueState,
} from '../followUpDate';

const pending = (scheduledFor: string) => ({ scheduledFor, reviewedAt: null });

describe('Follow-Up calendar dates and due state', () => {
  it('adds 7 local calendar days', () => {
    expect(addFollowUpCalendarDays('2026-01-01T07:00:00.000Z', 'Africa/Nairobi', 7)).toBe(
      '2026-01-08T07:00:00.000Z',
    );
  });
  it('adds 30 local calendar days across a month', () => {
    expect(
      followUpDateInputValue(addFollowUpCalendarDays('2026-01-15T07:00:00.000Z', 'UTC', 30), 'UTC'),
    ).toBe('2026-02-14');
  });
  it('crosses a year', () => {
    expect(
      followUpDateInputValue(addFollowUpCalendarDays('2026-12-28T10:00:00.000Z', 'UTC', 7), 'UTC'),
    ).toBe('2027-01-04');
  });
  it('handles leap-year February', () => {
    expect(
      followUpDateInputValue(addFollowUpCalendarDays('2028-02-22T10:00:00.000Z', 'UTC', 7), 'UTC'),
    ).toBe('2028-02-29');
  });
  it('preserves local clock time across DST', () => {
    expect(addFollowUpCalendarDays('2026-03-07T15:00:00.000Z', 'America/New_York', 7)).toBe(
      '2026-03-14T14:00:00.000Z',
    );
  });
  it('uses the Reading timezone rather than UTC date', () => {
    expect(
      followUpDateInputValue(
        addFollowUpCalendarDays('2026-01-01T23:30:00.000Z', 'Asia/Tokyo', 7),
        'Asia/Tokyo',
      ),
    ).toBe('2026-01-09');
  });
  it('builds a valid custom date at the Reading local time', () => {
    expect(customFollowUpDate('2026-04-15', '2026-04-01T07:30:00.000Z', 'Africa/Nairobi')).toBe(
      '2026-04-15T07:30:00.000Z',
    );
  });
  it('rejects a custom date before the Reading date', () => {
    expect(() =>
      customFollowUpDate('2026-03-31', '2026-04-01T07:30:00.000Z', 'Africa/Nairobi'),
    ).toThrow(ValidationRepositoryError);
  });
  it('rejects an impossible custom date', () => {
    expect(() => customFollowUpDate('2026-02-30', '2026-02-01T07:30:00.000Z', 'UTC')).toThrow(
      ValidationRepositoryError,
    );
  });
  it('classifies due today using the explicit timezone', () => {
    expect(
      getFollowUpDueState(pending('2026-07-13T01:00:00.000Z'), '2026-07-13T20:00:00.000Z', 'UTC'),
    ).toBe('due_today');
  });
  it('classifies overdue', () => {
    expect(
      getFollowUpDueState(pending('2026-07-12T23:59:00.000Z'), '2026-07-13T00:01:00.000Z', 'UTC'),
    ).toBe('overdue');
  });
  it('classifies upcoming', () => {
    expect(
      getFollowUpDueState(pending('2026-07-14T00:00:00.000Z'), '2026-07-13T23:59:00.000Z', 'UTC'),
    ).toBe('upcoming');
  });
  it('classifies reviewed records as completed regardless of planned date', () => {
    expect(
      getFollowUpDueState(
        { scheduledFor: '2020-01-01T00:00:00.000Z', reviewedAt: '2026-07-13T00:00:00.000Z' },
        '2026-07-13T00:00:00.000Z',
        'UTC',
      ),
    ).toBe('completed');
  });
});
