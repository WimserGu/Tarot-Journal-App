import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { borderRadii, spacing } from '@/theme/tokens';
export function DrawToolbar({
  disabled,
  canFinish,
  onFinish,
  onObserve,
  onHistory,
}: {
  disabled: boolean;
  canFinish: boolean;
  onFinish: () => void;
  onObserve: () => void;
  onHistory: () => void;
}) {
  return (
    <View style={styles.toolbar}>
      <ToolbarButton label="Observe" disabled={disabled} onPress={onObserve} />
      <ToolbarButton label="Finish" disabled={!canFinish || disabled} onPress={onFinish} />
      <ToolbarButton label="History" disabled={disabled} onPress={onHistory} />
    </View>
  );
}

function ToolbarButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderColor: '#54766B',
    borderRadius: borderRadii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  disabled: { opacity: 0.42 },
  label: { color: '#DCE8E3', fontWeight: '600' },
  pressed: { backgroundColor: '#294A40' },
  toolbar: {
    backgroundColor: '#102A24',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
