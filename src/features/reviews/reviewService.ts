import type { CardOrientation, TarotCard, TarotSuit, UUID } from '../../domain/types';
import { calculateStatistics } from '../statistics/statisticsService';
import type { StatisticsReading } from '../statistics/statisticsTypes';
import type {
  ActiveTopicStatistic,
  FirstEverCard,
  ReviewCardDelta,
  ReviewDelta,
  ReviewOrientationDelta,
  ReviewPeriod,
  ReviewPreview,
  ReviewStatisticsSnapshot,
  ReviewSuitDelta,
} from './reviewTypes';

const unique = (values: UUID[]) => [...new Set(values)];
const percent = (current: number, previous: number) =>
  previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100;
const inPeriod = (item: StatisticsReading, start: string, end: string) => {
  const value = Date.parse(item.reading.reading_at);
  return value >= Date.parse(start) && value < Date.parse(end);
};
const eligible = (item: StatisticsReading, includeDrafts: boolean) =>
  includeDrafts || item.reading.status === 'completed';

function delta(
  currentCount: number,
  previousCount: number,
  currentSourceReadingIds: UUID[],
  previousSourceReadingIds: UUID[],
): ReviewDelta {
  return {
    previousCount,
    currentCount,
    absoluteDelta: currentCount - previousCount,
    percentageDelta: percent(currentCount, previousCount),
    currentSourceReadingIds,
    previousSourceReadingIds,
  };
}

function activeTopics(readings: readonly StatisticsReading[]): ActiveTopicStatistic[] {
  const values = new Map<UUID, ActiveTopicStatistic>();
  readings.forEach((item) => {
    if (!item.topic) return;
    const current = values.get(item.topic.id) ?? {
      topicId: item.topic.id,
      topicTitle: item.topic.title,
      readingCount: 0,
      readingIds: [],
    };
    current.readingCount += 1;
    current.readingIds.push(item.reading.id);
    values.set(item.topic.id, current);
  });
  return [...values.values()].sort(
    (a, b) =>
      b.readingCount - a.readingCount ||
      a.topicTitle.localeCompare(b.topicTitle, 'zh-CN') ||
      a.topicId.localeCompare(b.topicId),
  );
}

function firstEverCards(
  all: readonly StatisticsReading[],
  current: readonly StatisticsReading[],
  periodStart: string,
  includeDrafts: boolean,
): FirstEverCard[] {
  const historicalIds = new Set(
    all
      .filter(
        (item) =>
          eligible(item, includeDrafts) &&
          Date.parse(item.reading.reading_at) < Date.parse(periodStart),
      )
      .flatMap((item) => item.cards.map((card) => card.tarotCard.id)),
  );
  const occurrences = new Map<
    number,
    { tarotCard: TarotCard; readingIds: UUID[]; count: number; first: string }
  >();
  [...current]
    .sort((a, b) => Date.parse(a.reading.reading_at) - Date.parse(b.reading.reading_at))
    .forEach((item) =>
      item.cards.forEach((card) => {
        if (historicalIds.has(card.tarotCard.id)) return;
        const value = occurrences.get(card.tarotCard.id) ?? {
          tarotCard: card.tarotCard,
          readingIds: [],
          count: 0,
          first: item.reading.id,
        };
        value.count += 1;
        value.readingIds = unique([...value.readingIds, item.reading.id]);
        occurrences.set(card.tarotCard.id, value);
      }),
    );
  return [...occurrences.values()]
    .map((value) => ({
      tarotCard: value.tarotCard,
      firstAppearanceReadingId: value.first,
      appearanceCountInPeriod: value.count,
      readingIds: value.readingIds,
    }))
    .sort((a, b) => a.tarotCard.sort_order - b.tarotCard.sort_order);
}

export function createSourceFingerprint(readings: readonly StatisticsReading[]): string {
  const source = [...readings]
    .sort((a, b) => a.reading.id.localeCompare(b.reading.id))
    .map((item) =>
      [
        item.reading.id,
        item.reading.updated_at,
        item.reading.status,
        ...[...item.cards]
          .sort((a, b) => a.positionOrder - b.positionOrder)
          .map((card) => `${card.tarotCard.id}:${card.orientation}:${card.positionOrder}`),
      ].join('|'),
    )
    .join('\n');
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildReviewPreview(
  allReadings: readonly StatisticsReading[],
  period: ReviewPeriod,
  includeDrafts: boolean,
  now: string | number,
): ReviewPreview {
  const currentReadings = allReadings.filter(
    (item) => eligible(item, includeDrafts) && inPeriod(item, period.periodStart, period.periodEnd),
  );
  const previousReadings = allReadings.filter(
    (item) =>
      eligible(item, includeDrafts) &&
      inPeriod(item, period.previousPeriodStart, period.previousPeriodEnd),
  );
  const filter = { includeDrafts };
  const current = calculateStatistics(currentReadings, filter, now);
  const previous = calculateStatistics(previousReadings, filter, now);
  const currentCards = new Map(current.cardStatistics.map((item) => [item.tarotCard.id, item]));
  const previousCards = new Map(previous.cardStatistics.map((item) => [item.tarotCard.id, item]));
  const cards = new Map<number, TarotCard>();
  current.cardStatistics.forEach((item) => cards.set(item.tarotCard.id, item.tarotCard));
  previous.cardStatistics.forEach((item) => cards.set(item.tarotCard.id, item.tarotCard));
  const cardChanges: ReviewCardDelta[] = [...cards.values()]
    .map((tarotCard) => {
      const currentItem = currentCards.get(tarotCard.id);
      const previousItem = previousCards.get(tarotCard.id);
      return {
        tarotCard,
        ...delta(
          currentItem?.totalCount ?? 0,
          previousItem?.totalCount ?? 0,
          currentItem?.readingIds ?? [],
          previousItem?.readingIds ?? [],
        ),
      };
    })
    .sort(
      (a, b) =>
        b.absoluteDelta - a.absoluteDelta || a.tarotCard.sort_order - b.tarotCard.sort_order,
    );
  const suitChanges = Object.fromEntries(
    (['wands', 'cups', 'swords', 'pentacles'] as TarotSuit[]).map((suit) => [
      suit,
      {
        suit,
        ...delta(
          current.suitDistribution[suit].count,
          previous.suitDistribution[suit].count,
          current.suitDistribution[suit].readingIds,
          previous.suitDistribution[suit].readingIds,
        ),
      } satisfies ReviewSuitDelta,
    ]),
  ) as Record<TarotSuit, ReviewSuitDelta>;
  const orientationChanges = Object.fromEntries(
    (['upright', 'reversed'] as CardOrientation[]).map((orientation) => {
      const currentValue = current.orientationDistribution[orientation];
      const previousValue = previous.orientationDistribution[orientation];
      return [
        orientation,
        {
          orientation,
          ...delta(
            currentValue.count,
            previousValue.count,
            currentValue.readingIds,
            previousValue.readingIds,
          ),
          previousRatio: previousValue.ratio,
          currentRatio: currentValue.ratio,
          ratioDelta: currentValue.ratio - previousValue.ratio,
        } satisfies ReviewOrientationDelta,
      ];
    }),
  ) as Record<CardOrientation, ReviewOrientationDelta>;
  const positive = cardChanges.filter((item) => item.absoluteDelta > 0);
  const negative = [...cardChanges]
    .filter((item) => item.absoluteDelta < 0)
    .sort(
      (a, b) =>
        a.absoluteDelta - b.absoluteDelta || a.tarotCard.sort_order - b.tarotCard.sort_order,
    );
  const snapshot: ReviewStatisticsSnapshot = {
    current,
    previous,
    activeTopics: activeTopics(
      currentReadings.filter((item) => item.reading.status === 'completed'),
    ),
    topCards: current.topCards,
    firstEverCards: firstEverCards(allReadings, currentReadings, period.periodStart, includeDrafts),
    cardChanges,
    largestIncreases: positive.slice(0, 5),
    largestDecreases: negative.slice(0, 5),
    newlyAppearingCards: cardChanges.filter(
      (item) => item.previousCount === 0 && item.currentCount > 0,
    ),
    noLongerAppearingCards: cardChanges.filter(
      (item) => item.previousCount > 0 && item.currentCount === 0,
    ),
    suitChanges,
    orientationChanges,
    topQuestions: current.questionStatistics,
  };
  return {
    period,
    includeDrafts,
    snapshot,
    sourceReadingIds: current.trace.readingIds,
    sourceFingerprint: createSourceFingerprint(
      allReadings.filter(
        (item) =>
          eligible(item, includeDrafts) &&
          Date.parse(item.reading.reading_at) < Date.parse(period.periodEnd),
      ),
    ),
  };
}
