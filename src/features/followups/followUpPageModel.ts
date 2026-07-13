import type { ReadingFollowUpListItem } from './followUpTypes';

export type PendingFollowUpModel = {
  overdueCount: number;
  dueTodayCount: number;
  visibleItems: ReadingFollowUpListItem[];
  isEmpty: boolean;
};

export function buildPendingFollowUpModel(
  items: readonly ReadingFollowUpListItem[],
  limit = 5,
): PendingFollowUpModel {
  return {
    overdueCount: items.filter((item) => item.dueState === 'overdue').length,
    dueTodayCount: items.filter((item) => item.dueState === 'due_today').length,
    visibleItems: items.slice(0, Math.max(0, limit)),
    isEmpty: items.length === 0,
  };
}

export const followUpDetailRoute = (followUpId: string) => ({
  pathname: '/followups/[followUpId]' as const,
  params: { followUpId },
});

export const followUpReadingRoute = (readingId: string) => ({
  pathname: '/readings/[readingId]' as const,
  params: { readingId },
});
