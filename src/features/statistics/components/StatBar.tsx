import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { borderRadii, colors, spacing } from '../../../theme/tokens';
type Props = { label: string; count: number; ratio: number; onPress?: () => void };
export function StatBar({ label, count, ratio, onPress }: Props) {
  const percent = Math.max(0, Math.min(100, ratio * 100));
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={styles.root}
    >
      <View style={styles.row}>
        <Text>{label}</Text>
        <Text>
          {count} · {percent.toFixed(1)}%
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.xs, minHeight: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  track: {
    backgroundColor: colors.border,
    borderRadius: borderRadii.md,
    height: 12,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.text, height: '100%' },
});
