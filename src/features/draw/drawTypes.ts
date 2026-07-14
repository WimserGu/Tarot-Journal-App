import type {
  CardEntrySource,
  CardOrientation,
  ISODateTime,
  ReversalExpression,
  TarotCard,
  UUID,
} from '../../domain/types';

export type ReversalMode = 'disabled' | 'standard' | 'expression';

export type NormalizedTablePlacement = {
  x: number;
  y: number;
  zIndex: number;
};

export type TarotTableState = {
  placementsByCardId: Record<string, NormalizedTablePlacement>;
};

export type DrawConfiguration = {
  cardCount: number;
  spreadId: string;
  spreadPositionIds: readonly string[];
  reversalMode: ReversalMode;
  reversedProbability: number;
  overexpressedProbabilityWhenReversed: number;
  questionText?: string;
  hiddenDeckCardIds?: number[];
  table?: TarotTableState;
  ritual?: {
    stage: 'prepare' | 'draw' | 'reveal' | 'reflection';
    drawnCount: number;
    revealedPositionIndexes: number[];
    isObserving?: boolean;
    cardNotes?: Record<string, string>;
  };
};

export type DrawnCard = {
  id: string;
  tarotCardId: TarotCard['id'];
  positionIndex: number;
  spreadPositionId: string;
  positionSnapshot?: string;
  orientation: CardOrientation;
  reversalExpression: ReversalExpression;
  source: CardEntrySource;
  drawSessionId: UUID | null;
};

export type DrawSession = {
  id: UUID;
  userId: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  spreadId: string | null;
  configuration: DrawConfiguration;
  status: 'draft' | 'saved' | 'discarded';
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
