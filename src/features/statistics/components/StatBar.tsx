import { Pressable, StyleSheet, View } from 'react-native';
import { MysticText as Text } from '../../../components/mystic';
import { useAppTheme } from '../../../theme/useAppTheme';
type Props = { label: string; count: number; ratio: number; onPress?: () => void };
export function StatBar({ label, count, ratio, onPress }: Props) {
  const { theme } = useAppTheme();
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
      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.divider, borderRadius: theme.radii.pill },
        ]}
      >
        <View
          style={[styles.fill, { backgroundColor: theme.colors.primarySoft, width: `${percent}%` }]}
        />
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root: { gap: 4, minHeight: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  track: {
    height: 12,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});
