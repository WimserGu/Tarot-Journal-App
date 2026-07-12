import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/AuthProvider';
export default function WelcomeScreen() {
  const router = useRouter();
  const { mode, enterLocalDevelopment } = useAuth();
  return (
    <Screen>
      <Text variant="eyebrow">Tarot Journal</Text>
      <Text variant="title">记录问题、牌面与真实变化</Text>
      <Text variant="muted">你的长期议题和阅读记录保持私密，并按时间形成可回看的脉络。</Text>
      {mode === 'local' ? (
        <>
          <Text variant="subtitle">Local Development Mode</Text>
          <Text>Data is stored on this device</Text>
          <Button label="进入开发体验" onPress={() => void enterLocalDevelopment()} />
        </>
      ) : (
        <>
          <Button label="邮箱登录" onPress={() => router.push('/(auth)/sign-in')} />
          <Button label="创建账号" onPress={() => router.push('/(auth)/sign-up')} />
        </>
      )}
    </Screen>
  );
}
