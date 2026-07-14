import { memo, useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import type { CardOrientation, ReversalVariant } from '@/domain/types';
import { RWS_FALLBACK_FRONT_ASSET } from '@/features/tarot/artwork/rwsAssets';
import {
  artworkRotation,
  defaultDeckThemeId,
  getCardBackSource,
  getCardFrontSource,
} from '@/features/tarot/artwork/tarotArtworkRegistry';

export type ArtworkSize = 'river' | 'table' | 'focus';

export const TAROT_CARD_ASPECT_RATIO = 456 / 787;

const dimensions = {
  river: { width: 74, height: 128 },
  table: { width: 82, height: 142 },
  focus: { width: 240, height: 414 },
} as const;

export const CARD_TABLE_WIDTH = dimensions.table.width;
export const CARD_TABLE_HEIGHT = dimensions.table.height;

export const TarotCardArtworkImage = memo(function TarotCardArtworkImage({
  deckThemeId = defaultDeckThemeId,
  tarotCardId,
  side,
  orientation = 'upright',
  reversalVariant = null,
  animatedRotation,
  size = 'table',
  accessibilityLabel,
}: {
  deckThemeId?: string;
  tarotCardId?: number;
  side: 'front' | 'back';
  orientation?: CardOrientation;
  reversalVariant?: ReversalVariant;
  animatedRotation?: Animated.AnimatedInterpolation<string | number>;
  size?: ArtworkSize;
  accessibilityLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [deckThemeId, side, tarotCardId]);
  const source =
    failed || (side === 'front' && tarotCardId === undefined)
      ? RWS_FALLBACK_FRONT_ASSET
      : side === 'back'
        ? getCardBackSource(deckThemeId)
        : getCardFrontSource(deckThemeId, tarotCardId!);
  const label =
    accessibilityLabel ?? (side === 'back' ? '未揭示的塔罗牌' : `塔罗牌 ${tarotCardId ?? '未知'}`);

  return (
    <View
      style={[styles.frame, side === 'front' ? styles.frontFrame : null, dimensions[size]]}
      testID={`tarot-artwork-${side}`}
    >
      <Animated.Image
        accessibilityLabel={label}
        fadeDuration={0}
        onError={() => setFailed(true)}
        resizeMode="contain"
        source={source}
        style={[
          styles.image,
          side === 'front'
            ? {
                transform: animatedRotation
                  ? [{ rotate: animatedRotation }]
                  : artworkRotation(orientation, reversalVariant),
              }
            : null,
        ]}
      />
    </View>
  );
});

export const DeckCardBack = memo(function DeckCardBack({
  size = 'river',
  accessibilityLabel,
}: {
  size?: ArtworkSize;
  accessibilityLabel?: string;
}) {
  return <TarotCardArtworkImage accessibilityLabel={accessibilityLabel} side="back" size={size} />;
});

export const CardArtwork = memo(function CardArtwork({
  cardId,
  orientation,
  reversalVariant = null,
  animatedRotation,
  size = 'table',
  accessibilityLabel,
}: {
  cardId: number;
  orientation: CardOrientation;
  reversalVariant?: ReversalVariant;
  animatedRotation?: Animated.AnimatedInterpolation<string | number>;
  size?: ArtworkSize;
  accessibilityLabel?: string;
}) {
  return (
    <TarotCardArtworkImage
      accessibilityLabel={accessibilityLabel}
      animatedRotation={animatedRotation}
      orientation={orientation}
      reversalVariant={reversalVariant}
      side="front"
      size={size}
      tarotCardId={cardId}
    />
  );
});

export const CardArtworkPreloader = memo(function CardArtworkPreloader({
  cardIds,
  deckThemeId = defaultDeckThemeId,
}: {
  cardIds: readonly number[];
  deckThemeId?: string;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.preloader}
    >
      {cardIds.map((cardId) => (
        <Image
          accessible={false}
          fadeDuration={0}
          key={cardId}
          source={getCardFrontSource(deckThemeId, cardId)}
          style={styles.preloadImage}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#E9E0CC',
    borderColor: '#D3C7AC',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  frontFrame: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    overflow: 'visible',
  },
  image: { height: '100%', width: '100%' },
  preloadImage: { height: 1, width: 1 },
  preloader: {
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'absolute',
    width: 1,
  },
});
