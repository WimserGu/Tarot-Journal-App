import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  EmptyMysticState,
  MysticHeader,
  MysticScreen,
  MysticText as Text,
} from '@/components/mystic';
import { TopicForm } from '@/features/topics/components/TopicForm';
import { topicRepository } from '@/repositories/repositoryFactory';
import type { TopicFormValues } from '@/features/topics/topicSchema';
import { useTopicDetail } from '@/features/topics/useTopics';

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
      <MysticScreen>
        <Text variant="muted">正在加载议题…</Text>
      </MysticScreen>
    );
  }

  if (errorMessage) {
    return (
      <MysticScreen>
        <EmptyMysticState
          title="暂时无法加载议题"
          description={errorMessage}
          actionLabel="重新加载"
          onAction={() => void reload()}
        />
      </MysticScreen>
    );
  }

  if (!detail) {
    return (
      <MysticScreen>
        <EmptyMysticState
          title="找不到这个长期议题"
          description="它可能已经被删除。"
          actionLabel="返回议题列表"
          onAction={() => router.replace('/topics')}
        />
      </MysticScreen>
    );
  }

  const initialValues: TopicFormValues = {
    name: detail.topic.title,
    description: detail.topic.description ?? '',
    icon: detail.topic.icon,
    isPinned: detail.topic.is_pinned,
  };

  return (
    <MysticScreen scroll maxWidth={760}>
      <MysticHeader
        eyebrow="长期议题"
        title="编辑议题"
        subtitle="调整名称、说明和展示方式。"
        onBack={() => router.back()}
      />
      <TopicForm
        initialValues={initialValues}
        onSubmit={updateTopic}
        submitError={submitError}
        submitLabel="保存修改"
      />
    </MysticScreen>
  );
}
