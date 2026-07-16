import { Pressable, StyleSheet, View } from 'react-native';
import { MysticText as Text } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';
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
      <ToolbarButton label="观察" disabled={disabled} onPress={onObserve} />
      <ToolbarButton label="完成抽牌" disabled={!canFinish || disabled} onPress={onFinish} />
      <ToolbarButton label="抽牌历史" disabled={disabled} onPress={onHistory} />
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
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? theme.colors.glassElevated : theme.colors.glass,
          borderColor: theme.colors.glassBorder,
          borderRadius: theme.radii.pill,
          opacity: disabled ? theme.opacity.disabled : 1,
          paddingHorizontal: theme.spacing.md,
        },
      ]}
    >
      <Text variant="caption" style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 4,
  },
  toolbar: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
