import { ActivityIndicator, Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { MysticText } from './MysticText';
import { useAppTheme } from '@/theme/useAppTheme';

export type MoonButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export function MoonButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  onPress,
  style,
  variant = 'primary',
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress(): void;
  style?: StyleProp<ViewStyle>;
  variant?: MoonButtonVariant;
}) {
  const { theme } = useAppTheme();
  const inactive = disabled || loading;
  const backgrounds = {
    primary: theme.colors.primary,
    secondary: theme.colors.glassElevated,
    ghost: 'transparent',
    destructive: 'rgba(255, 170, 169, 0.13)',
  };
  const colors = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textPrimary,
    ghost: theme.colors.primarySoft,
    destructive: theme.colors.danger,
  };
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: backgrounds[variant],
          borderColor: variant === 'primary' ? theme.colors.primarySoft : theme.colors.glassBorder,
          borderRadius: theme.radii.pill,
          borderWidth: theme.borders.hairline,
          justifyContent: 'center',
          minHeight: 46,
          minWidth: 46,
          opacity: inactive ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          transform: [{ scale: pressed && !inactive ? theme.motion.pressedScale : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[variant]} />
      ) : (
        <View pointerEvents="none">
          <MysticText style={{ color: colors[variant], fontWeight: '700' }}>{label}</MysticText>
        </View>
      )}
    </Pressable>
  );
}
