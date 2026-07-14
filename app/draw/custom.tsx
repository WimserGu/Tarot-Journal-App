import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

export default function CustomSpreadRoute() {
  const router = useRouter();
  return (
    <Screen>
      <Text variant="eyebrow">自定义牌阵</Text>
      <Text variant="title">即将开放</Text>
      <Text variant="muted">
        当前项目只有内置 Open Spread
        的底层能力，尚未实现可保存的位置结构编辑器，因此这里不会伪装成完整自定义牌阵。
      </Text>
      <Button label="返回抽牌方式" onPress={() => router.replace('/draw')} />
    </Screen>
  );
}
