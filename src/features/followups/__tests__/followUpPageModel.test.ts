import { describe, expect, it } from 'vitest';
import type { ReadingFollowUpListItem } from '../followUpTypes';
import {
  buildPendingFollowUpModel,
  followUpDetailRoute,
  followUpReadingRoute,
} from '../followUpPageModel';

const item = (
  id: string,
  dueState: ReadingFollowUpListItem['dueState'],
): ReadingFollowUpListItem => ({
  dueState,
  questionText: `Question ${id}`,
  readingAt: '2026-07-01T00:00:00.000Z',
  readingTimezone: 'UTC',
  followUp: {
    id,
    readingId: `reading-${id}`,
    scheduledFor: '2026-07-13T00:00:00.000Z',
    reviewedAt: null,
    status: 'scheduled',
    outcome: null,
    reflection: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
});

describe('Follow-Up page model', () => {
  it('builds the neutral empty state', () =>
    expect(buildPendingFollowUpModel([])).toMatchObject({
      overdueCount: 0,
      dueTodayCount: 0,
      isEmpty: true,
    }));
  it('counts overdue and due-today text states', () =>
    expect(buildPendingFollowUpModel([item('a', 'overdue'), item('b', 'due_today')])).toMatchObject(
      { overdueCount: 1, dueTodayCount: 1 },
    ));
  it('limits the home list without dropping total counts', () => {
    const model = buildPendingFollowUpModel(
      Array.from({ length: 6 }, (_, index) => item(String(index), 'overdue')),
      3,
    );
    expect(model.visibleItems).toHaveLength(3);
    expect(model.overdueCount).toBe(6);
  });
  it('builds Follow-Up detail navigation', () =>
    expect(followUpDetailRoute('f1')).toEqual({
      pathname: '/followups/[followUpId]',
      params: { followUpId: 'f1' },
    }));
  it('builds original Reading navigation', () =>
    expect(followUpReadingRoute('r1')).toEqual({
      pathname: '/readings/[readingId]',
      params: { readingId: 'r1' },
    }));
});
