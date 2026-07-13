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
  reversalMode: ReversalMode;
  reversedProbability: number;
  overexpressedProbabilityWhenReversed: number;
};

export type DrawnCard = {
  id: string;
  tarotCardId: TarotCard['id'];
  positionIndex: number;
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
};

export const DEFAULT_DRAW_CONFIGURATION: DrawConfiguration = {
  cardCount: 1,
  reversalMode: 'standard',
  reversedProbability: 0.5,
  overexpressedProbabilityWhenReversed: 0.5,
};
