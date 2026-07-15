import type { PropsWithChildren } from 'react';
import { Platform, type StyleProp, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type GlassPanelVariant = 'default' | 'elevated' | 'subtle';

export function GlassPanel({
  children,
  padding,
  style,
  variant = 'default',
}: PropsWithChildren<{
  padding?: number;
  style?: StyleProp<ViewStyle>;
  variant?: GlassPanelVariant;
}>) {
  const { theme } = useAppTheme();
  const backgrounds = {
    default: theme.colors.glass,
    elevated: theme.colors.glassElevated,
    subtle: theme.colors.glassSubtle,
  };
  const shadow = theme.shadows.panel;
  return (
    <View
      style={[
        {
          backgroundColor: backgrounds[variant],
          borderColor: theme.colors.glassBorder,
          borderRadius: theme.radii.lg,
          borderWidth: theme.borders.hairline,
          gap: theme.spacing.md,
          padding: padding ?? theme.spacing.lg,
          ...(Platform.OS === 'android'
            ? { elevation: variant === 'elevated' ? shadow.elevation : 0 }
            : variant === 'elevated'
              ? {
                  shadowColor: shadow.color,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: shadow.opacity,
                  shadowRadius: shadow.radius,
                }
              : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
