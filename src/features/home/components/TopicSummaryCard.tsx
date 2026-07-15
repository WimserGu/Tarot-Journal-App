import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { MysticText } from '@/components/mystic';
import { formatHomeDate, type HomeTopicIcon, type TopicSummary } from '@/features/home/homeData';
import { useAppTheme } from '@/theme/useAppTheme';

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
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={`查看议题：${summary.topic.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.glassSubtle,
        borderColor: theme.colors.glassBorder,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.spacing.md,
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.spacing.md,
      })}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.glass,
          borderRadius: theme.radii.md,
          height: 48,
          justifyContent: 'center',
          width: 48,
        }}
      >
        <Ionicons color={theme.icons.secondary} name={iconNames[summary.icon]} size={23} />
      </View>
      <View style={{ flex: 1, flexShrink: 1, gap: theme.spacing.xs }}>
        <MysticText variant="cardTitle">{summary.topic.title}</MysticText>
        <MysticText variant="caption">
          {summary.record_count} 条记录 · 最近更新{' '}
          {formatHomeDate(summary.topic.updated_at, timeZone)}
        </MysticText>
      </View>
      <Ionicons color={theme.icons.secondary} name="chevron-forward" size={20} />
    </Pressable>
  );
}
