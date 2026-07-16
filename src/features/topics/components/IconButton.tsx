import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type IconButtonProps = {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  tone = 'default',
}: IconButtonProps) {
  const { theme } = useAppTheme();
  const iconColor = tone === 'danger' ? theme.colors.danger : theme.icons.primary;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={theme.spacing.xs}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.glass,
          borderColor: theme.colors.glassBorder,
          borderRadius: theme.radii.pill,
          opacity: pressed ? theme.opacity.pressed : 1,
        },
      ]}
    >
      <Ionicons color={iconColor} name={icon} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
