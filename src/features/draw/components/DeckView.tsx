import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { borderRadii, colors, spacing } from '@/theme/tokens';

export function DeckView({ remaining }: { remaining: number }) {
  return (
    <View accessibilityLabel={`牌堆，剩余 ${remaining} 张`} style={styles.deck}>
      <Text style={styles.pattern}>✦</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  deck: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.text,
    borderColor: colors.accent,
    borderRadius: borderRadii.md,
    borderWidth: 2,
    height: 150,
    justifyContent: 'center',
    marginVertical: spacing.lg,
    width: 96,
  },
  pattern: { color: colors.accent, fontSize: 28 },
});
