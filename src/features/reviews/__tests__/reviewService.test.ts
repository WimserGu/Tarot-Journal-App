import { describe, expect, it } from 'vitest';
import { tarotCards } from '../../../domain/tarotCards';
import type { Reading, Topic } from '../../../domain/types';
import type { StatisticsReading } from '../../statistics/statisticsTypes';
import { getReviewPeriod } from '../reviewPeriod';
import { buildReviewPreview, createSourceFingerprint } from '../reviewService';

const fool = tarotCards.find((card) => card.card_key === 'major_fool')!;
const magician = tarotCards.find((card) => card.card_key === 'major_magician')!;
const cups = tarotCards.find((card) => card.suit === 'cups')!;
const topic = (id: string, title: string): Topic => ({
  id,
  user_id: 'user',
  title,
  description: null,
  icon: 'book',
  is_pinned: false,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});
function item(
  id: string,
  at: string,
  cards: (typeof fool)[],
  options: { topic?: Topic; status?: 'draft' | 'completed'; question?: string | null } = {},
): StatisticsReading {
  const reading: Reading = {
    id,
    user_id: 'user',
    topic_id: options.topic?.id ?? 'a',
    question_template_id: options.question === null ? null : 'q',
    question_text_snapshot: options.question ?? 'Fixed snapshot',
    spread_id: null,
    reading_at: at,
    reading_timezone: 'UTC',
    interpretation: null,
    reality_feedback: null,
    status: options.status ?? 'completed',
    is_favorite: false,
    created_at: at,
    updated_at: at,
  };
  return {
    reading,
    cards: cards.map((tarotCard, index) => ({
      tarotCard,
      orientation: index % 2 === 0 ? 'upright' : 'reversed',
      positionOrder: index + 1,
    })),
    topic: options.topic ?? topic('a', 'Alpha'),
    questionTemplate: null,
    questionText: options.question ?? 'Fixed snapshot',
  };
}
const readings = [
  item('history', '2026-06-20T12:00:00Z', [fool]),
  item('previous', '2026-07-08T12:00:00Z', [fool, cups], { topic: topic('b', 'Beta') }),
  item('current-1', '2026-07-14T12:00:00Z', [fool, magician, magician]),
  item('current-2', '2026-07-15T12:00:00Z', [magician, cups], { topic: topic('b', 'Beta') }),
  item('draft', '2026-07-16T12:00:00Z', [cups], { status: 'draft' }),
];
const period = getReviewPeriod('weekly', '2026-07-15T12:00:00Z', 'UTC', '2026-07-16T18:00:00Z');

describe('buildReviewPreview', () => {
  const result = buildReviewPreview(readings, period, false, '2026-07-16T18:00:00Z');
  it('reuses statistics for Reading, Card, duplicate draw and top-card counts', () => {
    expect(result.snapshot.current.readingCount.count).toBe(2);
    expect(result.snapshot.current.cardCount.count).toBe(5);
    expect(result.snapshot.topCards[0]).toMatchObject({ tarotCard: magician, totalCount: 3 });
  });
  it('excludes drafts by default and includes them on request', () => {
    expect(result.sourceReadingIds).not.toContain('draft');
    expect(buildReviewPreview(readings, period, true, 0).sourceReadingIds).toContain('draft');
  });
  it('calculates active Topics with stable tie ordering and trace IDs', () => {
    expect(result.snapshot.activeTopics.map((value) => value.topicTitle)).toEqual([
      'Alpha',
      'Beta',
    ]);
    expect(result.snapshot.activeTopics[0]?.readingIds).toEqual(['current-1']);
  });
  it('separates historical first-ever cards from newly appearing cards', () => {
    expect(result.snapshot.firstEverCards.map((value) => value.tarotCard.id)).toEqual([
      magician.id,
    ]);
    expect(result.snapshot.newlyAppearingCards.map((value) => value.tarotCard.id)).toContain(
      magician.id,
    );
    expect(result.snapshot.firstEverCards.map((value) => value.tarotCard.id)).not.toContain(
      fool.id,
    );
  });
  it('returns increases, decreases, suit and orientation deltas with sources', () => {
    expect(result.snapshot.largestIncreases[0]).toMatchObject({
      tarotCard: magician,
      absoluteDelta: 3,
    });
    expect(
      result.snapshot.cardChanges.find((value) => value.tarotCard.id === fool.id),
    ).toMatchObject({ previousCount: 1, currentCount: 1, absoluteDelta: 0 });
    expect(result.snapshot.suitChanges.cups).toMatchObject({ previousCount: 1, currentCount: 1 });
    expect(
      result.snapshot.orientationChanges.upright.currentSourceReadingIds.length,
    ).toBeGreaterThan(0);
  });
  it('uses question snapshots and carries trace IDs', () => {
    expect(result.snapshot.topQuestions[0]).toMatchObject({
      questionText: 'Fixed snapshot',
      readingCount: 2,
    });
    expect(result.snapshot.current.trace.readingIds).toEqual(['current-1', 'current-2']);
  });
  it('creates deterministic fingerprints without mutating inputs', () => {
    const before = JSON.stringify(readings);
    expect(createSourceFingerprint(readings)).toBe(
      createSourceFingerprint([...readings].reverse()),
    );
    expect(JSON.stringify(readings)).toBe(before);
  });
  it('detects source edits through fingerprint changes', () => {
    const changed = readings.map((value) =>
      value.reading.id === 'current-1'
        ? { ...value, reading: { ...value.reading, updated_at: '2026-07-17T00:00:00Z' } }
        : value,
    );
    expect(createSourceFingerprint(changed)).not.toBe(createSourceFingerprint(readings));
  });
  it('handles empty current and previous periods without NaN or Infinity', () => {
    const empty = buildReviewPreview([], period, false, 0);
    expect(empty.snapshot.current.readingCount.count).toBe(0);
    expect(empty.snapshot.orientationChanges.upright.percentageDelta).toBe(0);
    expect(JSON.stringify(empty)).not.toMatch(/NaN|Infinity/);
  });
  it('uses a half-open end boundary', () => {
    const boundary = item('boundary', period.periodEnd, [fool]);
    expect(buildReviewPreview([boundary], period, false, 0).sourceReadingIds).toEqual([]);
  });
});
