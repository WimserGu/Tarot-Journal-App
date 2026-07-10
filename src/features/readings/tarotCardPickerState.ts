import type { CardOrientation, TarotArcana, TarotCard, TarotSuit } from '@/domain/types';

import { searchTarotCards } from '../../domain/readingUtils';

export type ArcanaFilter = 'all' | TarotArcana;
export type SuitFilter = 'all' | TarotSuit;

export type TarotCardPickerFilters = {
  arcana: ArcanaFilter;
  query: string;
  suit: SuitFilter;
};

export const defaultTarotCardPickerFilters: TarotCardPickerFilters = {
  arcana: 'all',
  query: '',
  suit: 'all',
};

export function filterTarotCards(
  cards: readonly TarotCard[],
  filters: TarotCardPickerFilters,
): TarotCard[] {
  return searchTarotCards(filters.query, cards).filter((card) => {
    const matchesArcana = filters.arcana === 'all' || card.arcana === filters.arcana;
    const matchesSuit = filters.suit === 'all' || card.suit === filters.suit;

    return matchesArcana && matchesSuit;
  });
}

export function isTarotCardSelected(
  cardId: TarotCard['id'],
  selectedCardIds: readonly number[],
): boolean {
  return selectedCardIds.includes(cardId);
}

export function toggleCardOrientation(orientation: CardOrientation): CardOrientation {
  return orientation === 'upright' ? 'reversed' : 'upright';
}

export function hasActiveTarotCardPickerFilters(filters: TarotCardPickerFilters): boolean {
  return filters.query.trim().length > 0 || filters.arcana !== 'all' || filters.suit !== 'all';
}
