import type { ComponentProps } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../components/Text';
import { borderRadii, colors, spacing } from '../../theme/tokens';
type Props = ComponentProps<typeof TextInput> & { label: string; error?: string };
export function AuthField({ label, error, ...props }: Props) {
  return (
    <View style={styles.field}>
      <Text>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        aria-invalid={Boolean(error)}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  error: { color: '#9f2d20' },
});
