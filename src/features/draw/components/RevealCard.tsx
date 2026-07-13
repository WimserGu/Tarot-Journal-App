import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/Text';
import { borderRadii, colors, spacing } from '@/theme/tokens';
import { FaceDownCard } from './FaceDownCard';

export function RevealCard({
  revealed,
  label,
  name,
  orientation,
  onReveal,
}: {
  revealed: boolean;
  label: string;
  name: string;
  orientation: string;
  onReveal: () => void;
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
  if (!revealed)
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`揭示 ${label}`} onPress={onReveal}>
        <FaceDownCard label={label} />
      </Pressable>
    );
  return (
    <Animated.View style={[styles.card, { opacity: reduceMotion ? 1 : opacity }]}>
      <Text variant="subtitle">{label}</Text>
      <Text>{name}</Text>
      <Text variant="muted">{orientation}</Text>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 112,
    padding: spacing.sm,
    width: 140,
  },
});
