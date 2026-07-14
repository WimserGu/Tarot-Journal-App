import type {
  CardEntrySource,
  CardOrientation,
  ISODateTime,
  ReversalVariant,
  TarotCard,
  UUID,
} from '../../domain/types';

export type ReversalMode = 'disabled' | 'standard' | 'dual';

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
  rightProbabilityWhenReversed: number;
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
  reversalVariant: ReversalVariant;
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
  rightProbabilityWhenReversed: 0.5,
};
