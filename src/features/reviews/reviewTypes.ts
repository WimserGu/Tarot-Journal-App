import type { CardOrientation, ISODateTime, TarotCard, TarotSuit, UUID } from '../../domain/types';
import type {
  CardStatistic,
  QuestionStatistic,
  StatisticsResult,
} from '../statistics/statisticsTypes';

export type ReviewType = 'weekly' | 'monthly';
export type ReviewStatus = 'in_progress' | 'completed';

export type ReviewPeriod = {
  reviewType: ReviewType;
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
  previousPeriodStart: ISODateTime;
  previousPeriodEnd: ISODateTime;
  timezone: string;
  isInProgress: boolean;
};

export type ReviewDelta = {
  previousCount: number;
  currentCount: number;
  absoluteDelta: number;
  percentageDelta: number | null;
  currentSourceReadingIds: UUID[];
  previousSourceReadingIds: UUID[];
};

export type ReviewCardDelta = ReviewDelta & { tarotCard: TarotCard };
export type ReviewSuitDelta = ReviewDelta & { suit: TarotSuit };
export type ReviewOrientationDelta = ReviewDelta & {
  orientation: CardOrientation;
  previousRatio: number;
  currentRatio: number;
  ratioDelta: number;
};
export type ActiveTopicStatistic = {
  topicId: UUID;
  topicTitle: string;
  readingCount: number;
  readingIds: UUID[];
};
export type FirstEverCard = {
  tarotCard: TarotCard;
  firstAppearanceReadingId: UUID;
  appearanceCountInPeriod: number;
  readingIds: UUID[];
};

export type ReviewStatisticsSnapshot = {
  current: StatisticsResult;
  previous: StatisticsResult;
  activeTopics: ActiveTopicStatistic[];
  topCards: CardStatistic[];
  firstEverCards: FirstEverCard[];
  cardChanges: ReviewCardDelta[];
  largestIncreases: ReviewCardDelta[];
  largestDecreases: ReviewCardDelta[];
  newlyAppearingCards: ReviewCardDelta[];
  noLongerAppearingCards: ReviewCardDelta[];
  suitChanges: Record<TarotSuit, ReviewSuitDelta>;
  orientationChanges: Record<CardOrientation, ReviewOrientationDelta>;
  topQuestions: QuestionStatistic[];
};

export type Review = {
  id: UUID;
  reviewType: ReviewType;
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
  timezone: string;
  status: ReviewStatus;
  includeDrafts: boolean;
  statisticsSnapshot: ReviewStatisticsSnapshot;
  sourceReadingIds: UUID[];
  sourceFingerprint: string;
  personalSummary: string | null;
  generatedAt: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type ReviewListItem = Pick<
  Review,
  | 'id'
  | 'reviewType'
  | 'periodStart'
  | 'periodEnd'
  | 'timezone'
  | 'status'
  | 'sourceReadingIds'
  | 'generatedAt'
  | 'updatedAt'
> & { readingCount: number; cardCount: number };

export type ReviewListFilter = { reviewType?: ReviewType };
export type ReviewPeriodKey = Pick<Review, 'reviewType' | 'periodStart' | 'timezone'>;
export type CreateReviewInput = Omit<Review, 'id' | 'createdAt' | 'updatedAt'>;
export type RegenerateReviewInput = Pick<
  Review,
  'status' | 'statisticsSnapshot' | 'sourceReadingIds' | 'sourceFingerprint' | 'generatedAt'
>;

export type ReviewPreview = {
  period: ReviewPeriod;
  includeDrafts: boolean;
  snapshot: ReviewStatisticsSnapshot;
  sourceReadingIds: UUID[];
  sourceFingerprint: string;
};
