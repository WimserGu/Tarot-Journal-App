import { Text } from '@/components/Text';
export function RevealProgress({
  revealed,
  total,
  inverted = false,
}: {
  revealed: number;
  total: number;
  inverted?: boolean;
}) {
  return (
    <Text accessibilityLiveRegion="polite" style={inverted ? { color: '#B9CBC4' } : undefined}>
      {revealed} / {total} Revealed
    </Text>
  );
}
