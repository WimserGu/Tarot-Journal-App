import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { TopicForm } from '@/features/topics/components/TopicForm';
import { topicRepository } from '@/repositories/repositoryFactory';
import type { TopicFormValues } from '@/features/topics/topicSchema';
import { useTopicDetail } from '@/features/topics/useTopics';
import { spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function EditTopicScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const topicId = firstRouteParam(params.topicId);
  const {
    data: detail,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useTopicDetail(topicId);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateTopic = async (values: TopicFormValues) => {
    if (!topicId) {
      setSubmitError('缺少议题标识。');
      return;
    }

    setSubmitError(null);

    try {
      await topicRepository.updateTopic(topicId, values);
      router.replace({ pathname: '/topics/[topicId]', params: { topicId } });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '暂时无法保存长期议题。');
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Text variant="muted">正在加载议题…</Text>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen>
        <Text>{errorMessage}</Text>
        <Button label="重新加载" onPress={() => void reload()} />
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen>
        <Text variant="subtitle">找不到这个长期议题</Text>
        <Button label="返回议题列表" onPress={() => router.replace('/topics')} />
      </Screen>
    );
  }

  const initialValues: TopicFormValues = {
    name: detail.topic.title,
    description: detail.topic.description ?? '',
    icon: detail.topic.icon,
    isPinned: detail.topic.is_pinned,
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="返回议题详情"
          icon="arrow-back"
          onPress={() => router.back()}
        />
        <View style={styles.headerCopy}>
          <Text variant="eyebrow">长期议题</Text>
          <Text variant="title">编辑议题</Text>
        </View>
      </View>
      <TopicForm
        initialValues={initialValues}
        onSubmit={updateTopic}
        submitError={submitError}
        submitLabel="保存修改"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
});
