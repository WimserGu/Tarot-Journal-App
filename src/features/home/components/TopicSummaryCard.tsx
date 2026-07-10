import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { formatHomeDate, type HomeTopicIcon, type TopicSummary } from '@/features/home/homeData';
import { borderRadii, colors, spacing } from '@/theme/tokens';

type TopicSummaryCardProps = {
  summary: TopicSummary;
  timeZone: string;
  onPress: () => void;
};

const iconNames: Record<HomeTopicIcon, keyof typeof Ionicons.glyphMap> = {
  book: 'book-outline',
  briefcase: 'briefcase-outline',
  document: 'document-text-outline',
  heart: 'heart-outline',
};

export function TopicSummaryCard({ summary, timeZone, onPress }: TopicSummaryCardProps) {
  return (
    <Pressable
      accessibilityLabel={`查看议题：${summary.topic.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.iconBox}>
        <Ionicons color={colors.accent} name={iconNames[summary.icon]} size={24} />
      </View>
      <View style={styles.content}>
        <Text variant="subtitle">{summary.topic.title}</Text>
        <Text variant="muted">总记录数 {summary.record_count}</Text>
        <Text variant="muted">最近更新 {formatHomeDate(summary.topic.updated_at, timeZone)}</Text>
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
  cardPressed: {
    opacity: 0.8,
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
});
