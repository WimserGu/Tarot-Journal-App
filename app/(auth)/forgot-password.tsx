import { useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
  GlassPanel,
  MoonButton,
  MysticHeader,
  MysticScreen,
  MysticText,
} from '@/components/mystic';
import { AuthField } from '@/features/auth/AuthField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthError } from '@/features/auth/authErrors';
import { emailSchema } from '@/features/auth/authValidation';
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? '请输入有效邮箱。');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await sendPasswordRecovery(parsed.data, Linking.createURL('/recovery'));
      setMessage('如果该邮箱可以接收恢复邮件，你将很快收到后续说明。');
    } catch (e) {
      setMessage(
        e instanceof AuthError && e.code === 'network'
          ? e.message
          : '如果该邮箱可以接收恢复邮件，你将很快收到后续说明。',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <MysticScreen maxWidth={560}>
      <MysticHeader
        onBack={() => router.back()}
        subtitle="输入邮箱，我们会发送恢复说明。"
        title="重置密码"
      />
      <GlassPanel variant="elevated">
        <AuthField
          autoCapitalize="none"
          keyboardType="email-address"
          label="邮箱"
          onChangeText={setEmail}
          onSubmitEditing={() => void submit()}
          value={email}
        />
        {message ? (
          <MysticText accessibilityLiveRegion="polite" variant="caption">
            {message}
          </MysticText>
        ) : null}
        <MoonButton label="发送恢复邮件" loading={busy} onPress={() => void submit()} />
        <MoonButton
          label="返回登录"
          onPress={() => router.replace('/(auth)/sign-in')}
          variant="ghost"
        />
      </GlassPanel>
    </MysticScreen>
  );
}
