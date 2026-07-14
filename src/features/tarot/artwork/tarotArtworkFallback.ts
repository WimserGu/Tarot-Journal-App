import { RWS_FALLBACK_FRONT_ASSET } from './rwsAssets';
import type { TarotCardArtwork } from './tarotArtworkTypes';

export const fallbackTarotFront: TarotCardArtwork = Object.freeze({
  cardId: null,
  front: RWS_FALLBACK_FRONT_ASSET,
  filename: null,
  isFallback: true,
});
