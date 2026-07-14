import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';
export function ObservationOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="退出观察模式"
      onPress={onDismiss}
      style={styles.overlay}
    >
      <View>
        <Text variant="title" style={styles.text}>
          Observe
        </Text>
        <Text style={styles.text}>Tap anywhere to return to the table tools.</Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: '#0A1713CC',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  text: { color: colors.surface, textAlign: 'center' },
});
