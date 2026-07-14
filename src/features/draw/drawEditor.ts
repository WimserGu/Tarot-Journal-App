import type { TarotCard } from '../../domain/types';
import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import type { DrawnCard } from './drawTypes';

function reindex(cards: readonly DrawnCard[]): DrawnCard[] {
  return cards.map((card, positionIndex) => ({
    ...card,
    positionIndex,
    spreadPositionId: `open.card.${positionIndex + 1}`,
    positionSnapshot: `Card ${positionIndex + 1}`,
  }));
}

export function setDrawnCardOrientation(
  card: DrawnCard,
  orientation: 'upright' | 'reversed',
): DrawnCard {
  return {
    ...card,
    orientation,
    reversalVariant: orientation === 'upright' ? null : card.reversalVariant,
  };
}

export function setDrawnCardVariant(
  card: DrawnCard,
  reversalVariant: DrawnCard['reversalVariant'],
): DrawnCard {
  if (card.orientation === 'upright' && reversalVariant !== null) {
    throw new ValidationRepositoryError('Upright cards cannot have a reversal variant.', 'draw');
  }
  return { ...card, reversalVariant };
}

export function replaceDrawnCard(card: DrawnCard, tarotCard: TarotCard): DrawnCard {
  return { ...card, tarotCardId: tarotCard.id };
}

export function removeDrawnCard(cards: readonly DrawnCard[], index: number): DrawnCard[] {
  return reindex(cards.filter((_, candidate) => candidate !== index));
}

export function appendManualDrawCard(
  cards: readonly DrawnCard[],
  tarotCard: TarotCard,
  id: string,
): DrawnCard[] {
  if (cards.length >= 10) {
    throw new ValidationRepositoryError('Card count cannot exceed 10.', 'draw');
  }
  return [
    ...cards,
    {
      id,
      tarotCardId: tarotCard.id,
      positionIndex: cards.length,
      spreadPositionId: `open.card.${cards.length + 1}`,
      positionSnapshot: `Card ${cards.length + 1}`,
      orientation: 'upright',
      reversalVariant: null,
      source: 'manual',
      drawSessionId: null,
    },
  ];
}
