import { describe, expect, it } from 'vitest';

import { tarotCards } from '../tarotCards';
import { findTarotCardByName } from '../readingUtils';

describe('tarotCards', () => {
  it('contains all 78 standard cards with stable unique identifiers', () => {
    expect(tarotCards).toHaveLength(78);
    expect(new Set(tarotCards.map((card) => card.card_key)).size).toBe(78);
    expect(new Set(tarotCards.map((card) => card.id)).size).toBe(78);
    expect(tarotCards.filter((card) => card.arcana === 'major')).toHaveLength(22);
    expect(tarotCards.filter((card) => card.arcana === 'minor')).toHaveLength(56);
  });

  it('keeps major arcana suitless and minor arcana assigned to a suit', () => {
    const majorCards = tarotCards.filter((card) => card.arcana === 'major');
    const minorCards = tarotCards.filter((card) => card.arcana === 'minor');

    expect(majorCards.every((card) => card.suit === null)).toBe(true);
    expect(minorCards.every((card) => card.suit !== null)).toBe(true);
  });

  it('finds a card by Chinese name, English name, or stable key', () => {
    expect(findTarotCardByName('宝剑八')?.card_key).toBe('swords_eight');
    expect(findTarotCardByName('the sun')?.card_key).toBe('major_sun');
    expect(findTarotCardByName('pentacles_eight')?.name_zh).toBe('星币八');
  });

  it('returns undefined for an empty or unknown card name', () => {
    expect(findTarotCardByName('')).toBeUndefined();
    expect(findTarotCardByName('不存在的牌')).toBeUndefined();
  });
});
