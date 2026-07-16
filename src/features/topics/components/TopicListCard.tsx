import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { MysticText as Text } from '@/components/mystic';
import { formatTopicDate } from '@/features/topics/topicPresentation';
import type { TopicListItem } from '@/features/topics/topicRepository';
import { useAppTheme } from '@/theme/useAppTheme';

import { TopicIcon } from './TopicIcon';

type TopicListCardProps = {
  item: TopicListItem;
  timeZone: string;
  onPress: () => void;
};

export function TopicListCard({ item, timeZone, onPress }: TopicListCardProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={`查看议题：${item.topic.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.glass,
          borderColor: theme.colors.glassBorder,
          borderRadius: theme.radii.lg,
          gap: theme.spacing.md,
          opacity: pressed ? theme.opacity.pressed : 1,
          padding: theme.spacing.lg,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: theme.colors.glassElevated, borderRadius: theme.radii.md },
        ]}
      >
        <TopicIcon icon={item.topic.icon} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="subtitle">{item.topic.title}</Text>
          {item.topic.is_pinned ? (
            <Ionicons
              accessibilityLabel="已置顶"
              color={theme.colors.primarySoft}
              name="pin"
              size={16}
            />
          ) : null}
        </View>
        {item.topic.description ? <Text variant="muted">{item.topic.description}</Text> : null}
        <View style={styles.metadata}>
          <Text variant="muted">固定问题 {item.fixed_question_count}</Text>
          <Text variant="muted">记录 {item.record_count}</Text>
          <Text variant="muted">更新于 {formatTopicDate(item.latest_activity_at, timeZone)}</Text>
        </View>
      </View>
      <Ionicons color={theme.colors.textMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    flexShrink: 1,
    gap: 4,
  },
  iconBox: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});
