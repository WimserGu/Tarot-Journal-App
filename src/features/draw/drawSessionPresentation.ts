import type { Reading } from '../../domain/types';
import type { DrawSession } from './drawTypes';

export type DrawHistoryStatusFilter = 'all' | 'draft' | 'saved';
export type DrawHistorySort = 'newest' | 'oldest';

export function filterAndSortDrawSessions(
  sessions: readonly DrawSession[],
  filter: DrawHistoryStatusFilter,
  sort: DrawHistorySort,
): DrawSession[] {
  const direction = sort === 'newest' ? -1 : 1;
  return sessions
    .filter((session) => filter === 'all' || session.status === filter)
    .sort((first, second) => direction * first.createdAt.localeCompare(second.createdAt));
}

export function linkedReadingIsMissing(
  session: DrawSession,
  relatedReadings: readonly Reading[],
): boolean {
  return (
    session.linkedReadingId !== null &&
    !relatedReadings.some((reading) => reading.id === session.linkedReadingId)
  );
}
