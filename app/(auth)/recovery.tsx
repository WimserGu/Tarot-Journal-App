import { useEffect, useState } from 'react';
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
import { updatePasswordSchema } from '@/features/auth/authValidation';
export default function RecoveryScreen() {
  const router = useRouter();
  const { recoverSessionFromUrl, updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void Linking.getInitialURL()
      .then(async (url) => {
        if (!url) throw new AuthError('expired_recovery_link', '恢复链接无效或已过期。');
        await recoverSessionFromUrl(url);
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setError('此恢复链接无效或已过期，请重新申请。');
      });
    return () => {
      active = false;
    };
  }, [recoverSessionFromUrl]);
  const submit = async () => {
    if (busy) return;
    const parsed = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查密码。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(parsed.data.password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof AuthError ? e.message : '暂时无法更新密码。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <MysticScreen maxWidth={560}>
      <MysticHeader title="设置新密码" />
      <GlassPanel variant="elevated">
        {!ready && !error ? (
          <MysticText accessibilityRole="progressbar">正在验证恢复链接…</MysticText>
        ) : null}
        {error ? <MysticText accessibilityLiveRegion="polite">{error}</MysticText> : null}
        {ready ? (
          <>
            <AuthField label="新密码" value={password} onChangeText={setPassword} secureTextEntry />
            <AuthField
              label="确认新密码"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              onSubmitEditing={() => void submit()}
            />
            <MoonButton label="更新密码" loading={busy} onPress={() => void submit()} />
          </>
        ) : (
          <MoonButton label="重新申请" onPress={() => router.replace('/(auth)/forgot-password')} />
        )}
      </GlassPanel>
    </MysticScreen>
  );
}
