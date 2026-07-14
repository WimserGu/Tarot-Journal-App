import type { CardOrientation } from '../../../domain/types';
import { DEFAULT_DECK_THEME_ID, defaultTarotArtwork } from './defaultTarotArtwork';
import { fallbackTarotFront } from './tarotArtworkFallback';
import type {
  ArtworkResolutionStatus,
  TarotCardArtwork,
  TarotDeckTheme,
} from './tarotArtworkTypes';

const themesById: Readonly<Record<string, TarotDeckTheme>> = Object.freeze({
  [DEFAULT_DECK_THEME_ID]: defaultTarotArtwork,
});
const warnedFallbacks = new Set<string>();

function warnFallback(key: string, message: string) {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !warnedFallbacks.has(key)) {
    warnedFallbacks.add(key);
    console.warn(message);
  }
}

export const defaultDeckThemeId = DEFAULT_DECK_THEME_ID;
export const activeTarotArtwork = defaultTarotArtwork;

export function resolveDeckTheme(themeId = defaultDeckThemeId): {
  theme: TarotDeckTheme;
  status: 'ready' | 'fallback-theme';
} {
  const theme = themesById[themeId];
  if (theme) return { theme, status: 'ready' };
  warnFallback(`theme:${themeId}`, `[tarot-artwork] Unknown theme: ${themeId}`);
  return { theme: defaultTarotArtwork, status: 'fallback-theme' };
}

export function getDeckTheme(themeId = defaultDeckThemeId): TarotDeckTheme {
  return resolveDeckTheme(themeId).theme;
}

export function resolveCardArtwork(
  themeId: string,
  cardId: number,
): { artwork: TarotCardArtwork; status: ArtworkResolutionStatus } {
  const themeResolution = resolveDeckTheme(themeId);
  const artwork = themeResolution.theme.cardsById[cardId];
  if (!artwork) {
    warnFallback(`card:${cardId}`, `[tarot-artwork] Missing card asset for stable ID: ${cardId}`);
    return { artwork: fallbackTarotFront, status: 'fallback-card' };
  }
  return { artwork, status: themeResolution.status };
}

export function getCardArtwork(themeId: string, cardId: number): TarotCardArtwork {
  return resolveCardArtwork(themeId, cardId).artwork;
}

export function getTarotFrontArtwork(cardId: number, themeId = defaultDeckThemeId) {
  return getCardArtwork(themeId, cardId);
}

export function getCardFrontSource(themeId: string, cardId: number) {
  return getCardArtwork(themeId, cardId).front;
}

export function getCardBackSource(themeId = defaultDeckThemeId) {
  return getDeckTheme(themeId).cardBack;
}

export function getTarotCardBackArtwork(themeId = defaultDeckThemeId) {
  return getCardBackSource(themeId);
}

export function artworkRotation(orientation: CardOrientation) {
  return orientation === 'reversed' ? [{ rotate: '180deg' as const }] : undefined;
}

export function registeredDeckThemes(): readonly TarotDeckTheme[] {
  return Object.freeze(Object.values(themesById));
}
