import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { TopicForm } from '@/features/topics/components/TopicForm';
import { topicRepository } from '@/features/topics/mockTopicRepository';
import type { TopicFormValues } from '@/features/topics/topicSchema';
import { spacing } from '@/theme/tokens';

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
    <Screen scroll>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="返回议题列表"
          icon="arrow-back"
          onPress={() => router.back()}
        />
        <View style={styles.headerCopy}>
          <Text variant="eyebrow">长期议题</Text>
          <Text variant="title">新建议题</Text>
        </View>
      </View>
      <TopicForm
        initialValues={initialValues}
        onSubmit={createTopic}
        submitError={submitError}
        submitLabel="创建议题"
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
