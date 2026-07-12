import { ComponentProps, PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text as NativeText, TextStyle } from 'react-native';

import { colors, fontSizes } from '@/theme/tokens';

type TextVariant = 'body' | 'title' | 'subtitle' | 'eyebrow' | 'muted';

type TextProps = PropsWithChildren<{
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
}> &
  Omit<ComponentProps<typeof NativeText>, 'style'>;

export function Text({ children, variant = 'body', style, ...props }: TextProps) {
  return (
    <NativeText {...props} style={[styles.base, styles[variant], style]}>
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: 24,
  },
  body: {
    color: colors.text,
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: '700',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: '600',
    lineHeight: 28,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  muted: {
    color: colors.textMuted,
  },
});
