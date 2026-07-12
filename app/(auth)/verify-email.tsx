import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen>
      <Text variant="title">请验证邮箱</Text>
      <Text>注册已提交。请打开验证邮件完成确认，然后返回登录。</Text>
      {email ? <Text variant="muted">验证邮件已发送到你填写的邮箱。</Text> : null}
      <Button label="返回登录" onPress={() => router.replace('/(auth)/sign-in')} />
    </Screen>
  );
}
