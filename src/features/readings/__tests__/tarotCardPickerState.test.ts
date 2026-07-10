import { describe, expect, it } from 'vitest';

import { tarotCards } from '../../../domain/tarotCards';

import {
  defaultTarotCardPickerFilters,
  filterTarotCards,
  hasActiveTarotCardPickerFilters,
  isTarotCardSelected,
  toggleCardOrientation,
} from '../tarotCardPickerState';

describe('tarot card picker state', () => {
  it('searches Chinese and English card names while ignoring case and whitespace', () => {
    expect(
      filterTarotCards(tarotCards, { ...defaultTarotCardPickerFilters, query: ' 宝 剑 八 ' }).map(
        (card) => card.card_key,
      ),
    ).toEqual(['swords_eight']);
    expect(
      filterTarotCards(tarotCards, {
        ...defaultTarotCardPickerFilters,
        query: 'EIGHT OF SWORDS',
      }).map((card) => card.card_key),
    ).toEqual(['swords_eight']);
  });

  it('filters major arcana and each minor suit', () => {
    expect(
      filterTarotCards(tarotCards, { ...defaultTarotCardPickerFilters, arcana: 'major' }),
    ).toHaveLength(22);

    for (const suit of ['wands', 'cups', 'swords', 'pentacles'] as const) {
      const cards = filterTarotCards(tarotCards, { ...defaultTarotCardPickerFilters, suit });

      expect(cards).toHaveLength(14);
      expect(cards.every((card) => card.suit === suit)).toBe(true);
    }
  });

  it('combines search and filters', () => {
    expect(
      filterTarotCards(tarotCards, {
        arcana: 'minor',
        query: 'eight',
        suit: 'pentacles',
      }).map((card) => card.card_key),
    ).toEqual(['pentacles_eight']);
  });

  it('reports selected cards and toggles orientation', () => {
    expect(isTarotCardSelected(57, [57, 71])).toBe(true);
    expect(isTarotCardSelected(1, [57, 71])).toBe(false);
    expect(toggleCardOrientation('upright')).toBe('reversed');
    expect(toggleCardOrientation('reversed')).toBe('upright');
  });

  it('clears active search and filters by returning to the default state', () => {
    const filters = { arcana: 'minor' as const, query: 'eight', suit: 'swords' as const };

    expect(hasActiveTarotCardPickerFilters(filters)).toBe(true);
    expect(hasActiveTarotCardPickerFilters(defaultTarotCardPickerFilters)).toBe(false);
    expect(filterTarotCards(tarotCards, defaultTarotCardPickerFilters)).toHaveLength(78);
  });
});
