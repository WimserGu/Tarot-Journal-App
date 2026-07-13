import { Text } from '@/components/Text';
export function RevealProgress({ revealed, total }: { revealed: number; total: number }) {
  return (
    <Text accessibilityLiveRegion="polite">
      {revealed} / {total} Revealed
    </Text>
  );
}
