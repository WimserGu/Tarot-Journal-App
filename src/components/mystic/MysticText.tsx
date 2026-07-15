import type { ComponentProps, PropsWithChildren } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type MysticTextVariant =
  'display' | 'pageTitle' | 'sectionTitle' | 'cardTitle' | 'body' | 'caption' | 'muted';

type MysticTextProps = PropsWithChildren<{
  variant?: MysticTextVariant;
  style?: StyleProp<TextStyle>;
}> &
  Omit<ComponentProps<typeof Text>, 'style'>;

export function MysticText({ children, variant = 'body', style, ...props }: MysticTextProps) {
  const { theme } = useAppTheme();
  const sizes = theme.typography;
  const variants: Record<MysticTextVariant, TextStyle> = {
    display: {
      color: theme.colors.textPrimary,
      fontFamily: sizes.displayFamily,
      fontSize: sizes.display,
      fontWeight: '600',
      letterSpacing: 0.3,
      lineHeight: 40,
    },
    pageTitle: {
      color: theme.colors.textPrimary,
      fontFamily: sizes.displayFamily,
      fontSize: sizes.pageTitle,
      fontWeight: '600',
      lineHeight: 34,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: sizes.sectionTitle,
      fontWeight: '600',
      lineHeight: 28,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: sizes.cardTitle,
      fontWeight: '600',
      lineHeight: 24,
    },
    body: {
      color: theme.colors.textPrimary,
      fontFamily: sizes.bodyFamily,
      fontSize: sizes.body,
      lineHeight: 25,
    },
    caption: {
      color: theme.colors.textSecondary,
      fontSize: sizes.caption,
      lineHeight: 19,
    },
    muted: {
      color: theme.colors.textMuted,
      fontSize: sizes.body,
      lineHeight: 24,
    },
  };
  return (
    <Text {...props} style={[variants[variant], style]}>
      {children}
    </Text>
  );
}
