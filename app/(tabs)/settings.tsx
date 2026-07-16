import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Alert, View } from 'react-native';

import {
  GlassPanel,
  MoonButton,
  MysticHeader,
  MysticScreen,
  MysticText,
  SectionLabel,
} from '@/components/mystic';
import { useAuth } from '@/features/auth/AuthProvider';
import { journalStore } from '@/repositories/mockJournalStore';
import { useAppTheme } from '@/theme/useAppTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, signOut } = useAuth();
  const { theme } = useAppTheme();
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
    <MysticScreen maxWidth={760} scroll>
      <MysticHeader
        eyebrow="App preferences"
        subtitle="管理账号入口、隐私工具与本地开发选项。"
        title="Settings"
      />
      {mode === 'local' ? (
        <GlassPanel variant="elevated">
          <MysticText variant="sectionTitle">Local Development Mode</MysticText>
          <MysticText variant="caption">Data is stored on this device</MysticText>
        </GlassPanel>
      ) : null}
      <SectionLabel title="记录与回顾" />
      <GlassPanel>
        <MoonButton
          label="Weekly / Monthly Reviews"
          onPress={() => router.push('/reviews' as Href)}
          variant="secondary"
        />
        <MoonButton
          label="导入历史记录"
          onPress={() => router.push('/import' as Href)}
          variant="secondary"
        />
      </GlassPanel>
      <SectionLabel title="关于与引导" />
      <GlassPanel>
        <MoonButton
          label="重新查看 onboarding"
          onPress={() => router.push('/onboarding-review')}
          variant="secondary"
        />
        <MoonButton
          label="关于塔罗牌面"
          onPress={() => router.push('/artwork' as Href)}
          variant="secondary"
        />
      </GlassPanel>
      <MoonButton
        label={mode === 'local' ? '退出开发体验' : '退出登录'}
        onPress={() => void signOut()}
        variant="ghost"
      />
      {__DEV__ ? (
        <View style={{ gap: theme.spacing.sm }}>
          <MoonButton label="重置开发测试数据" onPress={resetTestData} variant="destructive" />
          {resetMessage ? <MysticText variant="caption">{resetMessage}</MysticText> : null}
        </View>
      ) : null}
    </MysticScreen>
  );
}
