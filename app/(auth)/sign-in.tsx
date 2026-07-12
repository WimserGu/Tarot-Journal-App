import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { AuthField } from '@/features/auth/AuthField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthError } from '@/features/auth/authErrors';
import { signInSchema } from '@/features/auth/authValidation';
export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查输入。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(parsed.data.email, parsed.data.password);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : '暂时无法登录。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen scroll>
      <Text variant="title">邮箱登录</Text>
      <AuthField
        label="邮箱"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <AuthField
        label="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={() => void submit()}
      />
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      <Button disabled={busy} label={busy ? '正在登录…' : '登录'} onPress={() => void submit()} />
      <Button label="忘记密码" onPress={() => router.push('/(auth)/forgot-password')} />
      <Button label="创建账号" onPress={() => router.push('/(auth)/sign-up')} />
    </Screen>
  );
}
