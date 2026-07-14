import { Image, type ImageResolvedAssetSource, type ImageSourcePropType } from 'react-native';
import { createArtworkPreloadCache, resolveArtworkPreloadUri } from './artworkPreloadCache';
import { defaultDeckThemeId, getCardFrontSource } from './tarotArtworkRegistry';

const artworkPreloadCache = createArtworkPreloadCache((uri) => Image.prefetch(uri));

const imageApi: {
  resolveAssetSource?: (source: ImageSourcePropType) => ImageResolvedAssetSource;
} = Image;

export function preloadTarotCardFront(
  tarotCardId: number,
  deckThemeId = defaultDeckThemeId,
): Promise<boolean> {
  const source = getCardFrontSource(deckThemeId, tarotCardId);
  const uri = resolveArtworkPreloadUri(source, imageApi.resolveAssetSource);
  if (!uri) return Promise.resolve(false);

  return artworkPreloadCache.preload(`${deckThemeId}:${tarotCardId}`, uri);
}
