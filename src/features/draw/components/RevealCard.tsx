import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text } from 'react-native';
import type { CardOrientation, ReversalVariant } from '@/domain/types';
import {
  reversalAccessibilityLabel,
  reversalStateLabel,
  reversalVariantForArtworkInspection,
} from '@/features/draw/reversalPresentation';
import {
  getCardArtworkRotation,
  getCardRevealRotation,
  getTraditionalReversalInspectionRotation,
} from '@/features/tarot/artwork/tarotArtworkRegistry';
import { CARD_TABLE_HEIGHT, CARD_TABLE_WIDTH, CardArtwork } from './CardArtwork';
import { FaceDownCard } from './FaceDownCard';

export function RevealCard({
  revealed,
  label,
  cardId,
  name,
  orientation,
  reversalVariant,
}: {
  revealed: boolean;
  label: string;
  cardId: number;
  name: string;
  orientation: CardOrientation;
  reversalVariant?: ReversalVariant;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useState(new Animated.Value(revealed ? 1 : 0))[0];
  const rotation = useState(new Animated.Value(0))[0];
  const [showTraditionalReversal, setShowTraditionalReversal] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);
  useEffect(() => {
    if (revealed && !reduceMotion) {
      const revealRotation = getCardRevealRotation(orientation, reversalVariant ?? null, false);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: revealRotation.duration,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: revealRotation.to,
          duration: revealRotation.duration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [opacity, orientation, reduceMotion, revealed, reversalVariant, rotation]);
  useEffect(() => setShowTraditionalReversal(false), [cardId, orientation, reversalVariant]);
  if (!revealed) return <FaceDownCard label={label} size="table" />;
  const variant = reversalVariant ?? null;
  const isDualReversal = orientation === 'reversed' && variant !== null;
  const displayedVariant = reversalVariantForArtworkInspection(
    variant,
    isDualReversal && showTraditionalReversal,
  );
  const accessibilityLabel = `${name}，${reversalAccessibilityLabel(orientation, variant)}`;
  const animatedRotation = rotation.interpolate({
    inputRange: [-180, -30, 0, 30, 180],
    outputRange: ['-180deg', '-30deg', '0deg', '30deg', '180deg'],
  });
  const counterRotation = rotation.interpolate({
    inputRange: [-180, -30, 0, 30, 180],
    outputRange: ['180deg', '30deg', '0deg', '-30deg', '-180deg'],
  });
  const toggleTraditionalReversal = () => {
    const nextShowTraditional = !showTraditionalReversal;
    const nextVariant = reversalVariantForArtworkInspection(variant, nextShowTraditional);
    setShowTraditionalReversal(nextShowTraditional);
    const targetRotation = nextShowTraditional
      ? getTraditionalReversalInspectionRotation(variant)
      : getCardArtworkRotation(orientation, nextVariant);
    rotation.stopAnimation();
    if (reduceMotion) {
      rotation.setValue(targetRotation);
      return;
    }
    Animated.timing(rotation, {
      toValue: targetRotation,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };
  const originalStateLabel = reversalStateLabel(orientation, variant);
  const rotationButtonLabel = showTraditionalReversal
    ? `恢复${originalStateLabel}`
    : `将${originalStateLabel}转为完全逆位`;
  const displayedRotation = showTraditionalReversal
    ? getTraditionalReversalInspectionRotation(variant)
    : getCardArtworkRotation(orientation, displayedVariant);
  const buttonOrbitRotation = reduceMotion ? `${displayedRotation}deg` : animatedRotation;
  const buttonCounterRotation = reduceMotion ? `${-displayedRotation}deg` : counterRotation;
  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { opacity: reduceMotion ? 1 : opacity }]}
    >
      <CardArtwork
        accessibilityLabel={accessibilityLabel}
        animatedRotation={reduceMotion ? undefined : animatedRotation}
        cardId={cardId}
        orientation={orientation}
        reversalVariant={displayedVariant}
        size="table"
      />
      {isDualReversal ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.buttonOrbit, { transform: [{ rotate: buttonOrbitRotation }] }]}
        >
          <Animated.View
            style={[
              styles.buttonAnchor,
              variant === 'left' ? styles.leftButton : styles.rightButton,
              { transform: [{ rotate: buttonCounterRotation }] },
            ]}
          >
            <Pressable
              accessibilityLabel={rotationButtonLabel}
              accessibilityRole="button"
              accessibilityState={{ selected: showTraditionalReversal }}
              hitSlop={7}
              onPress={(event) => {
                event.stopPropagation();
                toggleTraditionalReversal();
              }}
              style={({ pressed }) => [
                styles.rotationButton,
                pressed ? styles.rotationButtonPressed : null,
              ]}
            >
              <Text style={styles.rotationButtonText}>{variant === 'left' ? '↺' : '↻'}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonAnchor: {
    position: 'absolute',
    top: -13,
  },
  buttonOrbit: {
    height: CARD_TABLE_HEIGHT,
    left: 0,
    position: 'absolute',
    top: 0,
    width: CARD_TABLE_WIDTH,
    zIndex: 2,
  },
  container: { position: 'relative' },
  leftButton: { left: -13 },
  rightButton: { right: -13 },
  rotationButton: {
    alignItems: 'center',
    backgroundColor: '#102A24DD',
    borderColor: '#DCE8E3',
    borderRadius: 13,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  rotationButtonPressed: { backgroundColor: '#3B6A58' },
  rotationButtonText: { color: '#FFFFFF', fontSize: 17, lineHeight: 20 },
});
