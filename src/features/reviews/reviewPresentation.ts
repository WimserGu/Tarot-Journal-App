import type { ReviewPeriod } from './reviewTypes';
import type { Href } from 'expo-router';

export function formatReviewPeriod(
  period: Pick<ReviewPeriod, 'periodStart' | 'periodEnd' | 'timezone'>,
): string {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: period.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${formatter.format(Date.parse(period.periodStart))} – ${formatter.format(Date.parse(period.periodEnd) - 1)}`;
}
export function reviewDetailRoute(id: string): Href {
  return `/reviews/${id}` as Href;
}
export function signedDelta(value: number): string {
  if (value > 0) return `增加 +${value}`;
  if (value < 0) return `减少 ${value}`;
  return '无变化 0';
}
