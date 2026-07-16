import type { ComponentProps } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { MysticText } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = ComponentProps<typeof TextInput> & { label: string; error?: string };
export function AuthField({ label, error, ...props }: Props) {
  const { theme } = useAppTheme();
  const styles = StyleSheet.create({
    field: { gap: theme.spacing.xs },
    input: {
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: theme.borders.hairline,
      color: theme.colors.textPrimary,
      minHeight: 50,
      paddingHorizontal: theme.spacing.md,
    },
    error: { color: theme.colors.danger },
  });
  return (
    <View style={styles.field}>
      <MysticText variant="caption">{label}</MysticText>
      <TextInput
        accessibilityLabel={label}
        aria-invalid={Boolean(error)}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        {...props}
      />
      {error ? (
        <MysticText accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </MysticText>
      ) : null}
    </View>
  );
}
