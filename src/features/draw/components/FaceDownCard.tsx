import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { borderRadii, colors } from '@/theme/tokens';
export function FaceDownCard({ label }: { label: string }) {
  return (
    <View accessibilityLabel={`${label}，牌面朝下`} style={styles.card}>
      <Text style={styles.text}>✦</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderColor: colors.accent,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    height: 112,
    justifyContent: 'center',
    width: 74,
  },
  text: { color: colors.accent, fontSize: 22 },
});
