import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTopicDetail } from '@/features/topics/useTopics';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewQuestionPlaceholderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const topicId = firstRouteParam(params.topicId);
  const { data: detail } = useTopicDetail(topicId);

  return (
    <Screen scroll>
      <Text variant="eyebrow">固定问题占位页</Text>
      <Text variant="title">新增固定问题</Text>
      {detail ? <Text>所属议题：{detail.topic.title}</Text> : null}
      <Text variant="muted">完整的固定问题表单将在后续任务实现。</Text>
      <Button label="返回" onPress={() => router.back()} />
    </Screen>
  );
}
