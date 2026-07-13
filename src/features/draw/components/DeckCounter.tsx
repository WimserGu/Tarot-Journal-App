import { Text } from '@/components/Text';
export function DeckCounter({ remaining }: { remaining: number }) {
  return <Text variant="muted">{remaining} remaining</Text>;
}
