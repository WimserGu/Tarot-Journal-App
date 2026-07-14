import type {
  CardOrientation,
  ReversalVariant,
  QuestionTemplate,
  Reading,
  TarotCard,
  TarotSuit,
  Topic,
  UUID,
} from '../../domain/types';

export type StatisticsFilter = {
  topicId?: UUID;
  dateFrom?: string;
  dateTo?: string;
  includeDrafts: boolean;
};
export const defaultStatisticsFilter: StatisticsFilter = { includeDrafts: false };
export type StatisticsCard = {
  orientation: CardOrientation;
  reversalVariant?: ReversalVariant;
  tarotCard: TarotCard;
  positionOrder: number;
};
export type StatisticsReading = {
  reading: Reading;
  cards: StatisticsCard[];
  topic: Topic | null;
  questionTemplate: QuestionTemplate | null;
  questionText: string;
};
export type TraceableCount = { count: number; readingIds: UUID[] };
export type TraceableRatio = TraceableCount & { ratio: number; total: number };
export type CardStatistic = {
  tarotCard: TarotCard;
  totalCount: number;
  uprightCount: number;
  reversedCount: number;
  readingIds: UUID[];
};
export type QuestionStatistic = {
  questionTemplateId: UUID | null;
  questionText: string;
  readingIds: UUID[];
  readingCount: number;
};
export type CardStreak = { tarotCard: TarotCard; consecutiveReadings: number; readingIds: UUID[] };
export type PeriodComparison = {
  current: { readings: TraceableCount; cards: TraceableCount };
  previous: { readings: TraceableCount; cards: TraceableCount };
  readingChangePercent: number | null;
  cardChangePercent: number | null;
};
export type StatisticsResult = {
  readingCount: TraceableCount;
  cardCount: TraceableCount;
  majorArcanaRatio: TraceableRatio;
  minorArcanaRatio: TraceableRatio;
  orientationDistribution: Record<CardOrientation, TraceableRatio>;
  dualReversalDistribution: Record<'left' | 'right', TraceableRatio>;
  suitDistribution: Record<TarotSuit, TraceableRatio>;
  topCards: CardStatistic[];
  /** Complete card distribution for downstream review snapshots. */
  cardStatistics: CardStatistic[];
  questionStatistics: QuestionStatistic[];
  streaks: CardStreak[];
  recent7Days: TraceableCount;
  recent30Days: TraceableCount;
  comparison: PeriodComparison | null;
  trace: {
    readingIds: UUID[];
    readingCount: number;
    cardCount: number;
    readingTimezones: string[];
  };
  filterError: 'invalid_date_range' | null;
};
