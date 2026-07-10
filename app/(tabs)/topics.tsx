import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { TopicListCard } from '@/features/topics/components/TopicListCard';
import { getCurrentTimeZone } from '@/features/topics/topicPresentation';
import { useTopicList } from '@/features/topics/useTopics';
import { spacing } from '@/theme/tokens';

export default function TopicsScreen() {
  const router = useRouter();
  const {
    data: topics,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useTopicList();
  const timeZone = getCurrentTimeZone();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="eyebrow">持续观察</Text>
          <Text variant="title">长期议题</Text>
        </View>
        <IconButton
          accessibilityLabel="新建议题"
          icon="add"
          onPress={() => router.push('/topics/new')}
        />
      </View>

      {isLoading ? <Text variant="muted">正在加载议题…</Text> : null}

      {!isLoading && errorMessage ? (
        <View style={styles.state}>
          <Text>{errorMessage}</Text>
          <Button label="重新加载" onPress={() => void reload()} />
        </View>
      ) : null}

      {!isLoading && !errorMessage && topics.length === 0 ? (
        <View style={styles.state}>
          <Text variant="subtitle">还没有长期议题</Text>
          <Button label="创建第一个议题" onPress={() => router.push('/topics/new')} />
        </View>
      ) : null}

      {!isLoading && !errorMessage && topics.length > 0 ? (
        <View style={styles.list}>
          {topics.map((item) => (
            <TopicListCard
              item={item}
              key={item.topic.id}
              onPress={() => {
                router.push({
                  pathname: '/topics/[topicId]',
                  params: { topicId: item.topic.id },
                });
              }}
              timeZone={timeZone}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  state: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
});
