import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  GlassPanel,
  MoonButton,
  MysticHeader,
  MysticScreen,
  MysticText,
} from '@/components/mystic';
export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <MysticScreen maxWidth={560}>
      <MysticHeader title="请验证邮箱" />
      <GlassPanel variant="elevated">
        <MysticText>注册已提交。请打开验证邮件完成确认，然后返回登录。</MysticText>
        {email ? <MysticText variant="caption">验证邮件已发送到你填写的邮箱。</MysticText> : null}
        <MoonButton label="返回登录" onPress={() => router.replace('/(auth)/sign-in')} />
      </GlassPanel>
    </MysticScreen>
  );
}
