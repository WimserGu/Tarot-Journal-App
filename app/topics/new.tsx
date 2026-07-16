import { useRouter } from 'expo-router';
import { useState } from 'react';

import { MysticHeader, MysticScreen } from '@/components/mystic';
import { TopicForm } from '@/features/topics/components/TopicForm';
import { topicRepository } from '@/repositories/repositoryFactory';
import type { TopicFormValues } from '@/features/topics/topicSchema';

const initialValues: TopicFormValues = {
  name: '',
  description: '',
  icon: 'book',
  isPinned: false,
};

export default function CreateTopicScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createTopic = async (values: TopicFormValues) => {
    setSubmitError(null);

    try {
      const topic = await topicRepository.createTopic(values);
      router.replace({ pathname: '/topics/[topicId]', params: { topicId: topic.id } });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '暂时无法创建长期议题。');
    }
  };

  return (
    <MysticScreen scroll maxWidth={760}>
      <MysticHeader
        eyebrow="长期议题"
        title="新建议题"
        subtitle="为一段值得长期观察的经历建立自己的空间。"
        onBack={() => router.back()}
      />
      <TopicForm
        initialValues={initialValues}
        onSubmit={createTopic}
        submitError={submitError}
        submitLabel="创建议题"
      />
    </MysticScreen>
  );
}
