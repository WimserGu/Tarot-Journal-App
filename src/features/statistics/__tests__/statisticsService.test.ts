import { describe, expect, it } from 'vitest';
import { tarotCards } from '../../../domain/tarotCards';
import type { Reading } from '../../../domain/types';
import { calculateStatistics } from '../statisticsService';
import type { StatisticsReading } from '../statisticsTypes';
const fool = tarotCards.find((card) => card.card_key === 'major_fool')!;
const magician = tarotCards.find((card) => card.card_key === 'major_magician')!;
const wands = tarotCards.find((card) => card.suit === 'wands')!;
const cups = tarotCards.find((card) => card.suit === 'cups')!;
function item(
  id: string,
  at: string,
  cards: {
    card: typeof fool;
    orientation: 'upright' | 'reversed';
    reversalVariant?: 'left' | 'right' | null;
  }[],
  options: {
    status?: 'draft' | 'completed';
    topic?: string;
    question?: string | null;
    timezone?: string;
  } = {},
): StatisticsReading {
  const reading: Reading = {
    id,
    user_id: 'user',
    topic_id: options.topic ?? 'topic',
    question_template_id: options.question === null ? null : 'question',
    question_text_snapshot: 'Q',
    spread_id: null,
    reading_at: at,
    reading_timezone: options.timezone ?? 'America/New_York',
    interpretation: null,
    reality_feedback: null,
    status: options.status ?? 'completed',
    is_favorite: false,
    created_at: at,
    updated_at: at,
  };
  return {
    reading,
    cards: cards.map((value, index) => ({
      tarotCard: value.card,
      orientation: value.orientation,
      reversalVariant: value.reversalVariant ?? null,
      positionOrder: index + 1,
    })),
    topic: null,
    questionTemplate: null,
    questionText: options.question === null ? 'Temporary' : 'Fixed question',
  };
}
const readings = [
  item('r1', '2026-03-07T23:00:00-05:00', [
    { card: fool, orientation: 'upright' },
    { card: fool, orientation: 'reversed' },
    { card: wands, orientation: 'upright' },
  ]),
  item('r2', '2026-03-08T03:30:00-04:00', [
    { card: fool, orientation: 'upright' },
    { card: cups, orientation: 'reversed' },
  ]),
  item('r3', '2026-03-09T12:00:00-04:00', [
    { card: fool, orientation: 'upright' },
    { card: magician, orientation: 'reversed' },
  ]),
  item('r4', '2026-03-10T12:00:00-04:00', [{ card: fool, orientation: 'upright' }], {
    question: null,
  }),
  item('draft', '2026-03-10T13:00:00-04:00', [], { status: 'draft' }),
];
describe('calculateStatistics', () => {
  const result = calculateStatistics(
    readings,
    { includeDrafts: false },
    '2026-03-11T00:00:00-04:00',
  );
  it('counts Readings, card draws and duplicates', () => {
    expect(result.readingCount.count).toBe(4);
    expect(result.cardCount.count).toBe(8);
    expect(result.topCards[0]).toMatchObject({ totalCount: 5, uprightCount: 4, reversedCount: 1 });
  });
  it('calculates arcana, suit and orientation', () => {
    expect(result.majorArcanaRatio.count).toBe(6);
    expect(result.minorArcanaRatio.count).toBe(2);
    expect(result.suitDistribution.wands.count).toBe(1);
    expect(result.orientationDistribution.reversed.count).toBe(3);
  });
  it('keeps ordinary reversals out of the dual reversal refinement', () => {
    const mixed = [
      item('variants', '2026-03-10T12:00:00-04:00', [
        { card: fool, orientation: 'reversed', reversalVariant: null },
        { card: magician, orientation: 'reversed', reversalVariant: 'left' },
        { card: cups, orientation: 'reversed', reversalVariant: 'right' },
      ]),
    ];
    const variantResult = calculateStatistics(mixed, { includeDrafts: false }, 0);

    expect(variantResult.orientationDistribution.reversed).toMatchObject({ count: 3, total: 3 });
    expect(variantResult.dualReversalDistribution.left).toMatchObject({ count: 1, total: 2 });
    expect(variantResult.dualReversalDistribution.right).toMatchObject({ count: 1, total: 2 });
  });
  it('counts fixed questions and safely skips temporary questions', () =>
    expect(result.questionStatistics.map((q) => q.readingCount)).toEqual([3]));
  it('excludes and includes drafts', () => {
    expect(result.readingCount.readingIds).not.toContain('draft');
    expect(calculateStatistics(readings, { includeDrafts: true }, 0).readingCount.count).toBe(5);
  });
  it('uses inclusive boundaries across DST', () =>
    expect(
      calculateStatistics(
        readings,
        {
          includeDrafts: false,
          dateFrom: '2026-03-08T07:30:00.000Z',
          dateTo: '2026-03-09T16:00:00.000Z',
        },
        0,
      ).readingCount.readingIds,
    ).toEqual(['r2', 'r3']));
  it('interprets date-only boundaries in each Reading timezone', () =>
    expect(
      calculateStatistics(
        readings,
        { includeDrafts: false, dateFrom: '2026-03-08', dateTo: '2026-03-08' },
        0,
      ).readingCount.readingIds,
    ).toEqual(['r2']));
  it('filters Topics', () => {
    const mixed = [
      ...readings,
      item('other', '2026-03-10T00:00:00Z', [{ card: fool, orientation: 'upright' }], {
        topic: 'other',
      }),
    ];
    expect(
      calculateStatistics(mixed, { includeDrafts: false, topicId: 'topic' }, 0).readingCount.count,
    ).toBe(4);
  });
  it('handles empty, zero division and reversed dates', () => {
    const empty = calculateStatistics([], { includeDrafts: false }, 0);
    expect(empty.majorArcanaRatio.ratio).toBe(0);
    const invalid = calculateStatistics(
      readings,
      { includeDrafts: false, dateFrom: '2026-04-01', dateTo: '2026-03-01' },
      0,
    );
    expect(invalid.filterError).toBe('invalid_date_range');
    expect(invalid.readingCount.count).toBe(0);
  });
  it('reports recent periods from explicit time', () => {
    expect(result.recent7Days.count).toBe(4);
    expect(result.recent30Days.count).toBe(4);
  });
  it('finds streaks with trace IDs', () =>
    expect(result.streaks[0]).toMatchObject({
      consecutiveReadings: 4,
      readingIds: ['r1', 'r2', 'r3', 'r4'],
    }));
  it('compares periods without Infinity', () => {
    const value = calculateStatistics(
      readings,
      { includeDrafts: false, dateFrom: '2026-03-09T00:00:00Z', dateTo: '2026-03-11T00:00:00Z' },
      0,
    );
    expect(value.comparison).not.toBeNull();
    const change = value.comparison?.readingChangePercent;
    expect(change === null || Number.isFinite(change)).toBe(true);
  });
  it('provides a traceable comparison for the default period', () => {
    expect(result.comparison?.current.readings.readingIds).toEqual(['r1', 'r2', 'r3', 'r4']);
  });
  it('attaches trace IDs to aggregates', () => {
    expect(result.trace.readingIds).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(result.topCards.every((card) => card.readingIds.length > 0)).toBe(true);
  });
});
