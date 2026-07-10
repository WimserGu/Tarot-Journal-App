import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

export default function SettingsScreen() {
  return (
    <Screen>
      <Text variant="eyebrow">App preferences</Text>
      <Text variant="title">Settings</Text>
      <Text>Settings will hold account, privacy, and app configuration options.</Text>
    </Screen>
  );
}
