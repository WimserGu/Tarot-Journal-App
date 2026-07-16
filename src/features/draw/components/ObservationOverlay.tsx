import { Pressable, StyleSheet, View } from 'react-native';
import { MysticText as Text } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';
export function ObservationOverlay({ onDismiss }: { onDismiss: () => void }) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="退出观察模式"
      onPress={onDismiss}
      style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}
    >
      <View>
        <Text variant="pageTitle" style={styles.text}>
          静静观察
        </Text>
        <Text variant="muted" style={styles.text}>
          轻触任意位置返回牌桌工具。
        </Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  text: { textAlign: 'center' },
});
