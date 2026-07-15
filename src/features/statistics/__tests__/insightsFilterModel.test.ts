import { describe, expect, it } from 'vitest';

import {
  applyInsightsDatePreset,
  filterInsightCardChoices,
  insightsFilterSummary,
  INSIGHTS_VIEWS,
} from '../insightsFilterModel';

const cardChoices = [
  {
    tarotCard: { id: 0, name_zh: '愚人', name_en: 'The Fool', sort_order: 0 },
    totalCount: 2,
  },
  {
    tarotCard: { id: 1, name_zh: '魔术师', name_en: 'The Magician', sort_order: 1 },
    totalCount: 4,
  },
];

describe('Insights filter model', () => {
  it('shows every occurring card when the card picker opens without a query', () => {
    expect(filterInsightCardChoices(cardChoices, '')).toEqual(cardChoices);
  });

  it('filters the card picker by Chinese or English name without changing counts', () => {
    expect(filterInsightCardChoices(cardChoices, '魔术').map((card) => card.totalCount)).toEqual([
      4,
    ]);
    expect(filterInsightCardChoices(cardChoices, 'fool').map((card) => card.tarotCard.id)).toEqual([
      0,
    ]);
  });

  it('defines three focused views', () => {
    expect(INSIGHTS_VIEWS.map((view) => view.id)).toEqual(['overview', 'cards', 'trends']);
  });

  it('builds inclusive local presets without changing Topic or draft filters', () => {
    expect(
      applyInsightsDatePreset(
        { includeDrafts: true, topicId: 'relationship' },
        '7days',
        new Date(2026, 6, 15, 18),
      ),
    ).toEqual({
      includeDrafts: true,
      topicId: 'relationship',
      dateFrom: '2026-07-09',
      dateTo: '2026-07-15',
    });
  });

  it('summarizes collapsed global filters', () => {
    expect(
      insightsFilterSummary(
        { includeDrafts: false, topicId: 'relationship', dateFrom: '2026-07-01' },
        '关系',
      ),
    ).toBe('关系 · 全部问题标签 · 2026-07-01 至 不限 · 不含草稿');
    expect(
      insightsFilterSummary(
        {
          includeDrafts: false,
          topicId: 'relationship',
          questionTagId: 'tag-thoughts',
        },
        '关系',
        '对方的想法',
      ),
    ).toBe('关系 · 对方的想法 · 全部时间 · 不含草稿');
  });
});
