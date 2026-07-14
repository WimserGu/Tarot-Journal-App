import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import type { Review, ReviewStatisticsSnapshot, ReviewStatus, ReviewType } from './reviewTypes';

type Row = Record<string, unknown>;
const SNAPSHOT_KEYS = [
  'current',
  'previous',
  'activeTopics',
  'topCards',
  'firstEverCards',
  'cardChanges',
  'largestIncreases',
  'largestDecreases',
  'newlyAppearingCards',
  'noLongerAppearingCards',
  'suitChanges',
  'orientationChanges',
  'topQuestions',
] as const;
const STATISTICS_KEYS = [
  'readingCount',
  'cardCount',
  'majorArcanaRatio',
  'minorArcanaRatio',
  'orientationDistribution',
  'dualReversalDistribution',
  'suitDistribution',
  'topCards',
  'cardStatistics',
  'questionStatistics',
  'streaks',
  'recent7Days',
  'recent30Days',
  'comparison',
  'trace',
  'filterError',
] as const;
const LEGACY_STATISTICS_KEYS = STATISTICS_KEYS.filter((key) => key !== 'dualReversalDistribution');

function fail(field: string): never {
  throw new ValidationRepositoryError(`Invalid database value for ${field}.`, 'mapReview');
}
function record(value: unknown, field: string): Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Row)
    : fail(field);
}
function exactKeys(value: Row, expected: readonly string[], field: string): void {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (keys.length !== wanted.length || keys.some((key, index) => key !== wanted[index]))
    fail(field);
}
function string(row: Row, key: string): string {
  return typeof row[key] === 'string' ? row[key] : fail(key);
}
function nullableString(row: Row, key: string): string | null {
  return row[key] === null ? null : string(row, key);
}
function boolean(row: Row, key: string): boolean {
  return typeof row[key] === 'boolean' ? row[key] : fail(key);
}
function iso(row: Row, key: string): string {
  const value = string(row, key);
  return Number.isNaN(Date.parse(value)) ? fail(key) : value;
}
function enumValue<T extends string>(row: Row, key: string, allowed: readonly T[]): T {
  const value = string(row, key);
  return allowed.includes(value as T) ? (value as T) : fail(key);
}
function uuidArray(row: Row, key: string): string[] {
  const value = row[key];
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? value
    : fail(key);
}
function snapshot(value: unknown): ReviewStatisticsSnapshot {
  const result = record(value, 'statistics_snapshot');
  exactKeys(result, SNAPSHOT_KEYS, 'statistics_snapshot');
  const current = record(result.current, 'statistics_snapshot.current');
  const previous = record(result.previous, 'statistics_snapshot.previous');
  const normalizeStatistics = (statistics: Row, field: string) => {
    const isLegacy = !Object.keys(statistics).includes('dualReversalDistribution');
    exactKeys(statistics, isLegacy ? LEGACY_STATISTICS_KEYS : STATISTICS_KEYS, field);
    statistics.dualReversalDistribution ??= {
      left: { count: 0, total: 0, ratio: 0, readingIds: [] },
      right: { count: 0, total: 0, ratio: 0, readingIds: [] },
    };
  };
  normalizeStatistics(current, 'statistics_snapshot.current');
  normalizeStatistics(previous, 'statistics_snapshot.previous');
  for (const key of [
    'activeTopics',
    'topCards',
    'firstEverCards',
    'cardChanges',
    'largestIncreases',
    'largestDecreases',
    'newlyAppearingCards',
    'noLongerAppearingCards',
    'topQuestions',
  ] as const) {
    if (!Array.isArray(result[key])) fail(`statistics_snapshot.${key}`);
  }
  record(result.suitChanges, 'statistics_snapshot.suitChanges');
  record(result.orientationChanges, 'statistics_snapshot.orientationChanges');
  return result as ReviewStatisticsSnapshot;
}

export function mapReviewRow(row: Row): Review {
  return {
    id: string(row, 'id'),
    reviewType: enumValue<ReviewType>(row, 'review_type', ['weekly', 'monthly']),
    periodStart: iso(row, 'period_start'),
    periodEnd: iso(row, 'period_end'),
    timezone: string(row, 'timezone'),
    status: enumValue<ReviewStatus>(row, 'status', ['in_progress', 'completed']),
    includeDrafts: boolean(row, 'include_drafts'),
    statisticsSnapshot: snapshot(row.statistics_snapshot),
    sourceReadingIds: uuidArray(row, 'source_reading_ids'),
    sourceFingerprint: string(row, 'source_fingerprint'),
    personalSummary: nullableString(row, 'personal_summary'),
    generatedAt: iso(row, 'generated_at'),
    createdAt: iso(row, 'created_at'),
    updatedAt: iso(row, 'updated_at'),
  };
}

export function toReviewInsertRow(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Row {
  return {
    review_type: review.reviewType,
    period_start: review.periodStart,
    period_end: review.periodEnd,
    timezone: review.timezone,
    status: review.status,
    include_drafts: review.includeDrafts,
    statistics_snapshot: review.statisticsSnapshot,
    source_reading_ids: review.sourceReadingIds,
    source_fingerprint: review.sourceFingerprint,
    personal_summary: review.personalSummary,
    generated_at: review.generatedAt,
  };
}
