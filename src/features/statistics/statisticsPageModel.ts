import type { UUID } from '../../domain/types';
export type StatisticsPageState = 'loading' | 'error' | 'empty' | 'content';
export function getStatisticsPageState(
  loading: boolean,
  error: string | null,
  readingCount: number,
): StatisticsPageState {
  if (loading) return 'loading';
  if (error) return 'error';
  return readingCount === 0 ? 'empty' : 'content';
}
export function readingDetailRoute(readingId: UUID) {
  return { pathname: '/readings/[readingId]' as const, params: { readingId } };
}
