import { describe, expect, it } from 'vitest';
import { tarotCards } from '../../../../domain/tarotCards';
import { RWS_CARD_BACK_ASSET, RWS_FRONT_ASSETS, RWS_FRONT_FILENAMES } from '../rwsAssets';
import { fallbackTarotFront } from '../tarotArtworkFallback';
import {
  activeTarotArtwork,
  artworkRotation,
  defaultDeckThemeId,
  getCardBackSource,
  getCardFrontSource,
  getCardRevealRotation,
  getTraditionalReversalInspectionRotation,
  getDeckTheme,
  getTarotFrontArtwork,
  registeredDeckThemes,
  resolveCardArtwork,
  resolveDeckTheme,
} from '../tarotArtworkRegistry';

describe('RWS tarot artwork registry', () => {
  it('resolves the default Rider–Waite–Smith theme and metadata', () => {
    expect(defaultDeckThemeId).toBe('rws-1909');
    expect(getDeckTheme()).toMatchObject({
      id: 'rws-1909',
      name: 'Rider–Waite–Smith Tarot',
      artist: 'Pamela Colman Smith',
      year: 1909,
    });
    expect(registeredDeckThemes()).toHaveLength(1);
  });

  it('maps all 78 unique stable domain IDs to unique asset filenames', () => {
    const domainIds = tarotCards.map((card) => card.id);
    const mappedIds = Object.keys(activeTarotArtwork.cardsById).map(Number);
    const filenames = Object.values(RWS_FRONT_FILENAMES);
    expect(new Set(domainIds).size).toBe(78);
    expect(mappedIds.sort((left, right) => left - right)).toEqual(domainIds);
    expect(new Set(filenames).size).toBe(78);
    expect(Object.keys(RWS_FRONT_ASSETS)).toHaveLength(78);
    expect(tarotCards.every((card) => getTarotFrontArtwork(card.id).cardId === card.id)).toBe(true);
  });

  it('audits 22 Major Arcana from Fool through World', () => {
    const majors = tarotCards.filter((card) => card.arcana === 'major');
    expect(majors).toHaveLength(22);
    expect(majors.map((card) => card.id)).toEqual(Array.from({ length: 22 }, (_, id) => id));
    expect(RWS_FRONT_FILENAMES[0]).toBe('major_00_fool.jpg');
    expect(RWS_FRONT_FILENAMES[21]).toBe('major_21_world.jpg');
  });

  it.each(['wands', 'cups', 'swords', 'pentacles'] as const)(
    'audits 14 ordered %s cards from Ace through King',
    (suit) => {
      const cards = tarotCards.filter((card) => card.suit === suit);
      expect(cards).toHaveLength(14);
      expect(cards.map((card) => card.rank_order)).toEqual(
        Array.from({ length: 14 }, (_, index) => index + 1),
      );
      expect(cards[0]?.rank_code).toBe('ace');
      expect(cards[13]?.rank_code).toBe('king');
      expect(cards.every((card) => RWS_FRONT_FILENAMES[card.id]?.startsWith(`${suit}_`))).toBe(
        true,
      );
    },
  );

  it('resolves the static card back and fronts', () => {
    expect(getCardBackSource()).toBe(RWS_CARD_BACK_ASSET);
    expect(getCardFrontSource(defaultDeckThemeId, 0)).toBe(RWS_FRONT_ASSETS[0]);
  });

  it('returns a diagnostic fallback for an unknown card without throwing', () => {
    expect(resolveCardArtwork(defaultDeckThemeId, 9999)).toEqual({
      artwork: fallbackTarotFront,
      status: 'fallback-card',
    });
  });

  it('falls back to the default theme for an unknown theme ID', () => {
    expect(resolveDeckTheme('missing-theme')).toEqual({
      theme: activeTarotArtwork,
      status: 'fallback-theme',
    });
  });

  it('maps ordinary and dual reversals to their visual angles', () => {
    expect(artworkRotation('upright', null)).toEqual([{ rotate: '0deg' }]);
    expect(artworkRotation('reversed', null)).toEqual([{ rotate: '180deg' }]);
    expect(artworkRotation('reversed', 'left')).toEqual([{ rotate: '-30deg' }]);
    expect(artworkRotation('reversed', 'right')).toEqual([{ rotate: '30deg' }]);
  });

  it('uses the final angle immediately when reduced motion is enabled', () => {
    expect(getCardRevealRotation('reversed', 'left', true)).toEqual({
      from: -30,
      to: -30,
      duration: 0,
    });
    expect(getCardRevealRotation('reversed', null, false)).toEqual({
      from: 0,
      to: 180,
      duration: 320,
    });
  });

  it('continues dual reversals toward traditional reversal in their original direction', () => {
    expect(getTraditionalReversalInspectionRotation('left')).toBe(-180);
    expect(getTraditionalReversalInspectionRotation('right')).toBe(180);
  });

  it('uses stable IDs rather than translated display names', () => {
    const card = tarotCards[0]!;
    expect(getTarotFrontArtwork(card.id)).toBe(activeTarotArtwork.cardsById[card.id]);
    expect(RWS_FRONT_FILENAMES[card.id]).not.toContain(card.name_zh);
  });
});
