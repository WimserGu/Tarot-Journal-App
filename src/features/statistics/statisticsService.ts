import type { TarotSuit, UUID } from '../../domain/types';
import type {
  CardStatistic,
  PeriodComparison,
  StatisticsFilter,
  StatisticsReading,
  StatisticsResult,
  TraceableCount,
} from './statisticsTypes';

const DAY_MS = 86_400_000;
const unique = (values: UUID[]) => [...new Set(values)];
const time = (value?: string | number) =>
  typeof value === 'number' ? value : value ? Date.parse(value) : Number.NaN;
const boundary = (value: string | undefined, end: boolean) =>
  time(
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`
      : value,
  );
const dateOnly = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
function localDate(item: StatisticsReading): string {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: item.reading.reading_timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  const parts = formatter.formatToParts(time(item.reading.reading_at));
  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
function inFilterRange(
  item: StatisticsReading,
  filter: StatisticsFilter,
  start?: number,
  end?: number,
): boolean {
  const date = localDate(item);
  if (dateOnly(filter.dateFrom) && filter.dateFrom && date < filter.dateFrom) return false;
  if (dateOnly(filter.dateTo) && filter.dateTo && date > filter.dateTo) return false;
  return inRange(
    item,
    dateOnly(filter.dateFrom) ? undefined : start,
    dateOnly(filter.dateTo) ? undefined : end,
  );
}
const ratio = (count: number, total: number) => (total > 0 ? count / total : 0);
function countCards(readings: readonly StatisticsReading[]): TraceableCount {
  return {
    count: readings.reduce((sum, item) => sum + item.cards.length, 0),
    readingIds: readings.filter((item) => item.cards.length > 0).map((item) => item.reading.id),
  };
}
function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
function inRange(item: StatisticsReading, start?: number, end?: number) {
  const value = time(item.reading.reading_at);
  return (
    Number.isFinite(value) &&
    (start === undefined || value >= start) &&
    (end === undefined || value <= end)
  );
}
function periodComparison(
  all: readonly StatisticsReading[],
  current: readonly StatisticsReading[],
  filter: StatisticsFilter,
  now: number,
): PeriodComparison | null {
  const currentTimes = current.map((item) => time(item.reading.reading_at)).filter(Number.isFinite);
  const fallbackStart = currentTimes.length > 0 ? Math.min(...currentTimes) : now;
  const fallbackEnd = currentTimes.length > 0 ? Math.max(now, ...currentTimes) : now;
  const requestedStart = boundary(filter.dateFrom, false);
  const requestedEnd = boundary(filter.dateTo, true);
  const start = Number.isFinite(requestedStart) ? requestedStart : fallbackStart;
  const end = Number.isFinite(requestedEnd) ? requestedEnd : fallbackEnd;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const duration = end - start;
  const previousStart = start - duration;
  const previousEnd = start - 1;
  const allowed = (item: StatisticsReading) =>
    filter.includeDrafts || item.reading.status === 'completed';
  const scoped = (item: StatisticsReading) =>
    !filter.topicId || item.reading.topic_id === filter.topicId;
  const previous = all.filter(
    (item) => allowed(item) && scoped(item) && inRange(item, previousStart, previousEnd),
  );
  const currentCards = countCards(current);
  const previousCards = countCards(previous);
  return {
    current: {
      readings: { count: current.length, readingIds: current.map((x) => x.reading.id) },
      cards: currentCards,
    },
    previous: {
      readings: { count: previous.length, readingIds: previous.map((x) => x.reading.id) },
      cards: previousCards,
    },
    readingChangePercent: change(current.length, previous.length),
    cardChangePercent: change(currentCards.count, previousCards.count),
  };
}
function buildCardStatistics(readings: readonly StatisticsReading[]): CardStatistic[] {
  const values = new Map<number, CardStatistic>();
  readings.forEach((item) =>
    item.cards.forEach((card) => {
      const current = values.get(card.tarotCard.id) ?? {
        tarotCard: card.tarotCard,
        totalCount: 0,
        uprightCount: 0,
        reversedCount: 0,
        readingIds: [],
      };
      current.totalCount += 1;
      current[card.orientation === 'upright' ? 'uprightCount' : 'reversedCount'] += 1;
      current.readingIds = unique([...current.readingIds, item.reading.id]);
      values.set(card.tarotCard.id, current);
    }),
  );
  return [...values.values()].sort(
    (a, b) => b.totalCount - a.totalCount || a.tarotCard.sort_order - b.tarotCard.sort_order,
  );
}
function buildStreaks(readings: readonly StatisticsReading[], cards: readonly CardStatistic[]) {
  const ordered = [...readings].sort(
    (a, b) => time(a.reading.reading_at) - time(b.reading.reading_at),
  );
  return cards
    .flatMap(({ tarotCard }) => {
      let best: UUID[] = [];
      let run: UUID[] = [];
      ordered.forEach((item) => {
        if (item.cards.some((card) => card.tarotCard.id === tarotCard.id)) {
          run = [...run, item.reading.id];
          if (run.length > best.length) best = run;
        } else run = [];
      });
      return best.length > 1
        ? [{ tarotCard, consecutiveReadings: best.length, readingIds: best }]
        : [];
    })
    .sort(
      (a, b) =>
        b.consecutiveReadings - a.consecutiveReadings ||
        a.tarotCard.sort_order - b.tarotCard.sort_order,
    );
}
export function calculateStatistics(
  allReadings: readonly StatisticsReading[],
  filter: StatisticsFilter,
  nowIso: string | number,
): StatisticsResult {
  const from = boundary(filter.dateFrom, false);
  const to = boundary(filter.dateTo, true);
  const invalid =
    (filter.dateFrom !== undefined && !Number.isFinite(from)) ||
    (filter.dateTo !== undefined && !Number.isFinite(to)) ||
    (Number.isFinite(from) && Number.isFinite(to) && from > to);
  const readings = invalid
    ? []
    : allReadings.filter(
        (item) =>
          (filter.includeDrafts || item.reading.status === 'completed') &&
          (!filter.topicId || item.reading.topic_id === filter.topicId) &&
          inFilterRange(
            item,
            filter,
            Number.isFinite(from) ? from : undefined,
            Number.isFinite(to) ? to : undefined,
          ),
      );
  const readingIds = readings.map((item) => item.reading.id);
  const cards = buildCardStatistics(readings);
  const cardCount = countCards(readings);
  const cardEvents = readings.flatMap((item) =>
    item.cards.map((card) => ({ card, readingId: item.reading.id })),
  );
  const arcana = (kind: 'major' | 'minor') => {
    const events = cardEvents.filter((x) => x.card.tarotCard.arcana === kind);
    return {
      count: events.length,
      total: cardEvents.length,
      ratio: ratio(events.length, cardEvents.length),
      readingIds: unique(events.map((x) => x.readingId)),
    };
  };
  const orientation = (kind: 'upright' | 'reversed') => {
    const events = cardEvents.filter((x) => x.card.orientation === kind);
    return {
      count: events.length,
      total: cardEvents.length,
      ratio: ratio(events.length, cardEvents.length),
      readingIds: unique(events.map((x) => x.readingId)),
    };
  };
  const reversalVariant = (kind: 'left' | 'right') => {
    const variantEvents = cardEvents.filter(
      (event) =>
        event.card.orientation === 'reversed' &&
        (event.card.reversalVariant === 'left' || event.card.reversalVariant === 'right'),
    );
    const events = variantEvents.filter((event) => event.card.reversalVariant === kind);
    return {
      count: events.length,
      total: variantEvents.length,
      ratio: ratio(events.length, variantEvents.length),
      readingIds: unique(events.map((event) => event.readingId)),
    };
  };
  const suit = (kind: TarotSuit) => {
    const events = cardEvents.filter((x) => x.card.tarotCard.suit === kind);
    const minor = cardEvents.filter((x) => x.card.tarotCard.arcana === 'minor').length;
    return {
      count: events.length,
      total: minor,
      ratio: ratio(events.length, minor),
      readingIds: unique(events.map((x) => x.readingId)),
    };
  };
  const questions = new Map<
    string,
    {
      questionTemplateId: UUID | null;
      questionText: string;
      readingIds: UUID[];
      readingCount: number;
    }
  >();
  readings.forEach((item) => {
    if (!item.reading.question_template_id) return;
    const key = item.reading.question_template_id;
    const current = questions.get(key) ?? {
      questionTemplateId: item.reading.question_template_id,
      questionText: item.questionText,
      readingIds: [],
      readingCount: 0,
    };
    current.readingCount += 1;
    current.readingIds.push(item.reading.id);
    questions.set(key, current);
  });
  const now = time(nowIso);
  const recent = (days: number) => {
    const selected = Number.isFinite(now)
      ? readings.filter((item) => inRange(item, now - days * DAY_MS, now))
      : [];
    return { count: selected.length, readingIds: selected.map((item) => item.reading.id) };
  };
  return {
    readingCount: { count: readings.length, readingIds },
    cardCount,
    majorArcanaRatio: arcana('major'),
    minorArcanaRatio: arcana('minor'),
    orientationDistribution: { upright: orientation('upright'), reversed: orientation('reversed') },
    dualReversalDistribution: {
      left: reversalVariant('left'),
      right: reversalVariant('right'),
    },
    suitDistribution: {
      wands: suit('wands'),
      cups: suit('cups'),
      swords: suit('swords'),
      pentacles: suit('pentacles'),
    },
    topCards: cards.slice(0, 10),
    cardStatistics: cards,
    questionStatistics: [...questions.values()].sort(
      (a, b) => b.readingCount - a.readingCount || a.questionText.localeCompare(b.questionText),
    ),
    streaks: buildStreaks(readings, cards),
    recent7Days: recent(7),
    recent30Days: recent(30),
    comparison: invalid ? null : periodComparison(allReadings, readings, filter, now),
    trace: {
      readingIds,
      readingCount: readings.length,
      cardCount: cardCount.count,
      readingTimezones: unique(readings.map((item) => item.reading.reading_timezone)),
    },
    filterError: invalid ? 'invalid_date_range' : null,
  };
}
