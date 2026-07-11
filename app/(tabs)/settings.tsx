import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { journalStore } from '@/repositories/mockJournalStore';

export default function SettingsScreen() {
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const resetTestData = () => {
    Alert.alert('重置开发测试数据？', '这会恢复内置示例数据，并覆盖当前本地记录。', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: () => {
          void journalStore.resetToSeed().then(
            () => setResetMessage('开发测试数据已恢复。'),
            () => setResetMessage('无法重置开发测试数据。'),
          );
        },
      },
    ]);
  };

  return (
    <Screen>
      <Text variant="eyebrow">App preferences</Text>
      <Text variant="title">Settings</Text>
      <Text>Settings will hold account, privacy, and app configuration options.</Text>
      {__DEV__ ? (
        <View>
          <Button label="重置开发测试数据" onPress={resetTestData} />
          {resetMessage ? <Text variant="muted">{resetMessage}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}
