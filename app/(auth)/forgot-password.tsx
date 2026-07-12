import { useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
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
    <Screen>
      <Text variant="title">重置密码</Text>
      <Text variant="muted">输入邮箱，我们会发送恢复说明。</Text>
      <AuthField
        label="邮箱"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        onSubmitEditing={() => void submit()}
      />
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
      <Button
        disabled={busy}
        label={busy ? '正在发送…' : '发送恢复邮件'}
        onPress={() => void submit()}
      />
      <Button label="返回登录" onPress={() => router.replace('/(auth)/sign-in')} />
    </Screen>
  );
}
