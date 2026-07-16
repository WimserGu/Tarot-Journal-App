import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  EmptyMysticState,
  GlassPanel,
  MoonButton,
  MysticHeader,
  MysticScreen,
  MysticText as Text,
} from '@/components/mystic';
import { TopicListCard } from '@/features/topics/components/TopicListCard';
import { getCurrentTimeZone } from '@/features/topics/topicPresentation';
import { useTopicList } from '@/features/topics/useTopics';
import { useAppTheme } from '@/theme/useAppTheme';

export default function TopicsScreen() {
  const router = useRouter();
  const {
    data: topics,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useTopicList();
  const timeZone = getCurrentTimeZone();
  const { theme } = useAppTheme();

  return (
    <MysticScreen scroll maxWidth={960}>
      <MysticHeader
        eyebrow="持续观察"
        title="长期议题"
        subtitle="把反复出现的问题放进同一条时间线。"
        action={<MoonButton label="新建议题" onPress={() => router.push('/topics/new')} />}
      />

      {isLoading ? (
        <GlassPanel variant="subtle">
          <Text variant="muted">正在加载议题…</Text>
        </GlassPanel>
      ) : null}

      {!isLoading && errorMessage ? (
        <EmptyMysticState
          title="暂时无法加载议题"
          description={errorMessage}
          actionLabel="重新加载"
          onAction={() => void reload()}
        />
      ) : null}

      {!isLoading && !errorMessage && topics.length === 0 ? (
        <EmptyMysticState
          title="还没有长期议题"
          description="创建一个议题，开始积累同一主题下的长期观察。"
          actionLabel="创建第一个议题"
          onAction={() => router.push('/topics/new')}
        />
      ) : null}

      {!isLoading && !errorMessage && topics.length > 0 ? (
        <View style={[styles.list, { gap: theme.spacing.md }]}>
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
    </MysticScreen>
  );
}

const styles = StyleSheet.create({
  list: {},
});
