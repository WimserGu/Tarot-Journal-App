import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { formatHomeDate, type TodayQuestionSummary } from '@/features/home/homeData';
import type { CardOrientation } from '@/domain/types';
import { borderRadii, colors, spacing } from '@/theme/tokens';

type TodayQuestionCardProps = {
  question: TodayQuestionSummary;
  timeZone: string;
  onStart: () => void;
};

function orientationLabel(orientation: CardOrientation): string {
  return orientation === 'upright' ? '正位' : '逆位';
}

export function TodayQuestionCard({ question, timeZone, onStart }: TodayQuestionCardProps) {
  const lastRecordLabel = question.last_reading_at
    ? formatHomeDate(question.last_reading_at, timeZone)
    : '尚未记录';
  const lastCardLabel = question.last_card
    ? `${question.last_card.name_zh} · ${orientationLabel(question.last_card.orientation)}`
    : '暂无牌面';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="eyebrow">{question.topic.title}</Text>
        <View
          accessibilityLabel={question.is_completed_today ? '今日已完成' : '今日待记录'}
          style={[
            styles.status,
            question.is_completed_today ? styles.statusCompleted : styles.statusPending,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              question.is_completed_today ? styles.statusTextCompleted : styles.statusTextPending,
            ]}
          >
            {question.is_completed_today ? '今日已完成' : '今日待记录'}
          </Text>
        </View>
      </View>

      <Text style={styles.questionText} variant="subtitle">
        {question.question_template.question_text}
      </Text>

      <View style={styles.metadata}>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel} variant="muted">
            上次记录
          </Text>
          <Text style={styles.metadataValue}>{lastRecordLabel}</Text>
        </View>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel} variant="muted">
            上次出现的牌
          </Text>
          <Text style={styles.metadataValue}>{lastCardLabel}</Text>
        </View>
      </View>

      <Button label="开始记录" onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metadataItem: {
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xs,
  },
  metadataLabel: {
    fontSize: 12,
  },
  metadataValue: {
    flexShrink: 1,
    fontWeight: '600',
  },
  questionText: {
    flexShrink: 1,
  },
  status: {
    borderRadius: borderRadii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusCompleted: {
    backgroundColor: colors.surfaceMuted,
  },
  statusPending: {
    backgroundColor: colors.accent,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: colors.accent,
  },
  statusTextPending: {
    color: colors.surface,
  },
});
