import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { formatTopicDate } from '@/features/topics/topicPresentation';
import type { TopicListItem } from '@/features/topics/topicRepository';
import { borderRadii, colors, spacing } from '@/theme/tokens';

import { TopicIcon } from './TopicIcon';

type TopicListCardProps = {
  item: TopicListItem;
  timeZone: string;
  onPress: () => void;
};

export function TopicListCard({ item, timeZone, onPress }: TopicListCardProps) {
  return (
    <Pressable
      accessibilityLabel={`查看议题：${item.topic.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.iconBox}>
        <TopicIcon icon={item.topic.icon} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="subtitle">{item.topic.title}</Text>
          {item.topic.is_pinned ? (
            <Ionicons accessibilityLabel="已置顶" color={colors.accent} name="pin" size={16} />
          ) : null}
        </View>
        {item.topic.description ? <Text variant="muted">{item.topic.description}</Text> : null}
        <View style={styles.metadata}>
          <Text variant="muted">固定问题 {item.fixed_question_count}</Text>
          <Text variant="muted">记录 {item.record_count}</Text>
          <Text variant="muted">更新于 {formatTopicDate(item.latest_activity_at, timeZone)}</Text>
        </View>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  content: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
