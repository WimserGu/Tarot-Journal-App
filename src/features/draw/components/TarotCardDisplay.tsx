import { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';

import { MysticText } from '@/components/mystic';
import type { CardOrientation, ReversalVariant } from '@/domain/types';
import {
  reversalAccessibilityLabel,
  reversalStateLabel,
} from '@/features/draw/reversalPresentation';
import { useAppTheme } from '@/theme/useAppTheme';
import { useReducedMotion } from '@/theme/useReducedMotion';

import { CardArtwork } from './CardArtwork';

export type TarotCardDisplaySize = 'compact' | 'standard' | 'hero';

export function TarotCardDisplay({
  cardId,
  name,
  orientation,
  reversalVariant = null,
  showLabel = true,
  size = 'standard',
}: {
  cardId: number;
  name: string;
  orientation: CardOrientation;
  reversalVariant?: ReversalVariant;
  showLabel?: boolean;
  size?: TarotCardDisplaySize;
}) {
  const { theme } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const dimensions = theme.cards[size];
  const artworkSize = size === 'compact' ? 'river' : size === 'hero' ? 'focus' : 'table';
  const shadow = theme.shadows.card;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      duration: theme.motion.normal,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [progress, reducedMotion, theme.motion.normal]);

  return (
    <Animated.View
      accessibilityLabel={`${name}，${reversalAccessibilityLabel(orientation, reversalVariant)}`}
      style={{
        alignItems: 'center',
        gap: theme.spacing.sm,
        opacity: progress,
        transform: [
          {
            scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
          },
        ],
      }}
    >
      <View
        style={{
          backgroundColor: theme.colors.moonlight,
          borderColor: theme.colors.primarySoft,
          borderRadius: theme.radii.sm,
          borderWidth: theme.borders.regular,
          height: dimensions.height + 4,
          justifyContent: 'center',
          padding: 1,
          width: dimensions.width + 4,
          ...(Platform.OS === 'android'
            ? { elevation: shadow.elevation }
            : {
                shadowColor: shadow.color,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: shadow.opacity,
                shadowRadius: shadow.radius,
              }),
        }}
      >
        <CardArtwork
          accessibilityLabel={`${name}，${reversalAccessibilityLabel(orientation, reversalVariant)}`}
          cardId={cardId}
          orientation={orientation}
          reversalVariant={reversalVariant}
          size={artworkSize}
        />
      </View>
      {showLabel ? (
        <View style={{ alignItems: 'center', maxWidth: Math.max(dimensions.width + 36, 150) }}>
          <MysticText style={{ textAlign: 'center' }} variant="cardTitle">
            {name}
          </MysticText>
          <MysticText style={{ textAlign: 'center' }} variant="caption">
            {reversalStateLabel(orientation, reversalVariant)}
          </MysticText>
        </View>
      ) : null}
    </Animated.View>
  );
}
