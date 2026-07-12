import { useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { AuthField } from '@/features/auth/AuthField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthError } from '@/features/auth/authErrors';
import { signUpSchema } from '@/features/auth/authValidation';
export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    const parsed = signUpSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查输入。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signUp(
        parsed.data.email,
        parsed.data.password,
        Linking.createURL('/(auth)/sign-in'),
      );
      if (result.requiresEmailVerification)
        router.replace({ pathname: '/(auth)/verify-email', params: { email: parsed.data.email } });
    } catch (e) {
      setError(e instanceof AuthError ? e.message : '暂时无法注册。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen scroll>
      <Text variant="title">创建账号</Text>
      <AuthField
        label="邮箱"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AuthField
        label="密码（至少 8 个字符）"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <AuthField
        label="确认密码"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        onSubmitEditing={() => void submit()}
      />
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      <Button disabled={busy} label={busy ? '正在注册…' : '注册'} onPress={() => void submit()} />
      <Button label="返回登录" onPress={() => router.replace('/(auth)/sign-in')} />
    </Screen>
  );
}
