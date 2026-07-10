import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

export default function InsightsScreen() {
  return (
    <Screen>
      <Text variant="eyebrow">Patterns over time</Text>
      <Text variant="title">Insights</Text>
      <Text>
        Insights will show frequency, orientation, suit, and repeated-card patterns from real
        records.
      </Text>
    </Screen>
  );
}
