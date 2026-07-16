import { useRouter } from 'expo-router';
import { GlassPanel, MoonButton, MysticScreen, MysticText } from '@/components/mystic';
import { useAuth } from '@/features/auth/AuthProvider';
export default function WelcomeScreen() {
  const router = useRouter();
  const { mode, enterLocalDevelopment } = useAuth();
  return (
    <MysticScreen maxWidth={640}>
      <MysticText variant="eyebrow">Tarot Journal</MysticText>
      <MysticText variant="display">记录问题、牌面与真实变化</MysticText>
      <MysticText variant="caption">
        你的长期议题和阅读记录保持私密，并按时间形成可回看的脉络。
      </MysticText>
      <GlassPanel variant="elevated">
        {mode === 'local' ? (
          <>
            <MysticText variant="sectionTitle">Local Development Mode</MysticText>
            <MysticText variant="caption">Data is stored on this device</MysticText>
            <MoonButton label="进入开发体验" onPress={() => void enterLocalDevelopment()} />
          </>
        ) : (
          <>
            <MysticText variant="sectionTitle">进入你的私人记录空间</MysticText>
            <MoonButton label="邮箱登录" onPress={() => router.push('/(auth)/sign-in')} />
            <MoonButton
              label="创建账号"
              onPress={() => router.push('/(auth)/sign-up')}
              variant="secondary"
            />
          </>
        )}
      </GlassPanel>
    </MysticScreen>
  );
}
