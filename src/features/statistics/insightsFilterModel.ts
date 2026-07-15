import type { StatisticsFilter } from './statisticsTypes';

export const INSIGHTS_VIEWS = [
  { id: 'overview', label: '概览' },
  { id: 'cards', label: '单牌' },
  { id: 'trends', label: '趋势' },
] as const;

export type InsightsView = (typeof INSIGHTS_VIEWS)[number]['id'];
export type InsightsDatePreset = 'all' | '7days' | '30days' | 'custom';

export function filterInsightCardChoices<
  T extends { tarotCard: { name_zh: string; name_en: string } },
>(
  cards: readonly T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  if (normalizedQuery.length === 0) return [...cards];
  return cards.filter(
    ({ tarotCard }) =>
      tarotCard.name_zh.toLocaleLowerCase('zh-CN').includes(normalizedQuery) ||
      tarotCard.name_en.toLocaleLowerCase().includes(normalizedQuery),
  );
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function applyInsightsDatePreset(
  filter: StatisticsFilter,
  preset: InsightsDatePreset,
  now: Date,
): StatisticsFilter {
  if (preset === 'all') return { ...filter, dateFrom: undefined, dateTo: undefined };
  if (preset === 'custom') return filter;
  const days = preset === '7days' ? 6 : 29;
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return { ...filter, dateFrom: localDate(start), dateTo: localDate(now) };
}

export function insightsFilterSummary(
  filter: StatisticsFilter,
  topicTitle: string | undefined,
  questionTagLabel?: string,
): string {
  const topic = topicTitle ?? '全部 Topic';
  const questionTag =
    filter.questionTagId === undefined
      ? '全部问题标签'
      : (questionTagLabel ?? (filter.questionTagId === null ? '未分类' : '已选问题标签'));
  const range =
    filter.dateFrom || filter.dateTo
      ? `${filter.dateFrom ?? '不限'} 至 ${filter.dateTo ?? '不限'}`
      : '全部时间';
  return `${topic} · ${questionTag} · ${range} · ${filter.includeDrafts ? '包含草稿' : '不含草稿'}`;
}
