import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import type { CardOrientation, ReversalExpression } from '@/domain/types';
import { CardArtwork } from './CardArtwork';
import { FaceDownCard } from './FaceDownCard';

export function RevealCard({
  revealed,
  label,
  cardId,
  name,
  orientation,
  reversalExpression,
}: {
  revealed: boolean;
  label: string;
  cardId: number;
  name: string;
  orientation: CardOrientation;
  reversalExpression?: ReversalExpression;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useState(new Animated.Value(revealed ? 1 : 0))[0];
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);
  useEffect(() => {
    if (revealed && !reduceMotion)
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [opacity, reduceMotion, revealed]);
  if (!revealed) return <FaceDownCard label={label} size="table" />;
  const orientationText = orientation === 'reversed' ? '逆位' : '正位';
  const expressionText =
    reversalExpression === 'underexpressed'
      ? '，表达不足'
      : reversalExpression === 'overexpressed'
        ? '，表达过度'
        : '';
  const accessibilityLabel = `${name}，${orientationText}${expressionText}`;
  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel}
      style={{ opacity: reduceMotion ? 1 : opacity }}
    >
      <CardArtwork
        accessibilityLabel={accessibilityLabel}
        cardId={cardId}
        orientation={orientation}
        size="table"
      />
    </Animated.View>
  );
}
