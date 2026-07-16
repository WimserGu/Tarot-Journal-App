import { MysticText as Text } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';
export function RevealProgress({
  revealed,
  total,
  inverted = false,
}: {
  revealed: number;
  total: number;
  inverted?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{ color: inverted ? theme.colors.textSecondary : theme.colors.textPrimary }}
      variant="caption"
    >
      {revealed} / {total} Revealed
    </Text>
  );
}
