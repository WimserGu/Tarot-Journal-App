import { tarotCards } from '../../../domain/tarotCards';
import {
  RWS_CARD_BACK_ASSET,
  RWS_FALLBACK_FRONT_ASSET,
  RWS_FRONT_ASSETS,
  RWS_FRONT_FILENAMES,
} from './rwsAssets';
import type { DeckArtworkManifest, TarotCardArtwork, TarotDeckTheme } from './tarotArtworkTypes';

export const DEFAULT_DECK_THEME_ID = 'rws-1909';

export const rwsArtworkManifest: DeckArtworkManifest = Object.freeze({
  deckId: DEFAULT_DECK_THEME_ID,
  displayName: 'Rider–Waite–Smith Tarot',
  artist: 'Pamela Colman Smith',
  originalPublicationYear: 1909,
  sourceName: 'Wikimedia Commons — Rider–Waite–Smith tarot deck (TaionWC)',
  sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)',
  licenseLabel: 'Public Domain Mark (per individual Wikimedia Commons file pages)',
  attribution: 'Rider–Waite–Smith illustrations by Pamela Colman Smith, first published 1909.',
  cardBackSource: 'Original geometric artwork created for Tarot Journal App.',
  assetVersion: '1.0.0',
});

const cardsById = Object.freeze(
  Object.fromEntries(
    tarotCards.map((card): [number, TarotCardArtwork] => [
      card.id,
      Object.freeze({
        cardId: card.id,
        front: RWS_FRONT_ASSETS[card.id]!,
        filename: RWS_FRONT_FILENAMES[card.id]!,
        isFallback: false,
      }),
    ]),
  ),
) as Readonly<Record<number, TarotCardArtwork>>;

export const defaultTarotArtwork: TarotDeckTheme = Object.freeze({
  id: DEFAULT_DECK_THEME_ID,
  name: 'Rider–Waite–Smith Tarot',
  shortName: 'RWS',
  artist: 'Pamela Colman Smith',
  year: 1909,
  cardBack: RWS_CARD_BACK_ASSET,
  fallbackFront: RWS_FALLBACK_FRONT_ASSET,
  cardsById,
  attribution: rwsArtworkManifest.attribution,
  manifest: rwsArtworkManifest,
});
