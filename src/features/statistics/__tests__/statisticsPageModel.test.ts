import { describe, expect, it } from 'vitest';
import { getStatisticsPageState, readingDetailRoute } from '../statisticsPageModel';
describe('Statistics page model', () => {
  it('covers loading, error, empty and content states', () => {
    expect(getStatisticsPageState(true, null, 0)).toBe('loading');
    expect(getStatisticsPageState(false, 'error', 0)).toBe('error');
    expect(getStatisticsPageState(false, null, 0)).toBe('empty');
    expect(getStatisticsPageState(false, null, 1)).toBe('content');
  });
  it('builds trace navigation to Reading detail', () =>
    expect(readingDetailRoute('reading-id')).toEqual({
      pathname: '/readings/[readingId]',
      params: { readingId: 'reading-id' },
    }));
});
