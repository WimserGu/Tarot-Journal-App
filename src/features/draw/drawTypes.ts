import type {
  CardEntrySource,
  CardOrientation,
  ISODateTime,
  ReversalExpression,
  TarotCard,
  UUID,
} from '../../domain/types';

export type ReversalMode = 'disabled' | 'standard' | 'expression';

export type DrawConfiguration = {
  cardCount: number;
  spreadId: string;
  spreadPositionIds: readonly string[];
  reversalMode: ReversalMode;
  reversedProbability: number;
  overexpressedProbabilityWhenReversed: number;
};

export type DrawnCard = {
  id: string;
  tarotCardId: TarotCard['id'];
  positionIndex: number;
  spreadPositionId: string;
  orientation: CardOrientation;
  reversalExpression: ReversalExpression;
  source: CardEntrySource;
  drawSessionId: UUID | null;
};

export type DrawSession = {
  id: UUID;
  createdAt: ISODateTime;
  configuration: DrawConfiguration;
  cards: DrawnCard[];
  linkedReadingId: UUID | null;
};

export type DrawResult = {
  cards: Omit<DrawnCard, 'drawSessionId'>[];
  configuration: DrawConfiguration;
  createdAt: ISODateTime;
};

export const DEFAULT_DRAW_CONFIGURATION: DrawConfiguration = {
  cardCount: 1,
  spreadId: 'single-card',
  spreadPositionIds: ['single-card.reflection'],
  reversalMode: 'standard',
  reversedProbability: 0.5,
  overexpressedProbabilityWhenReversed: 0.5,
};
