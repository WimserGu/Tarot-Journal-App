import { View } from 'react-native';

import { GlassPanel, MoonButton, MysticText } from '@/components/mystic';
import { formatHomeDate, type TodayQuestionSummary } from '@/features/home/homeData';
import { reversalStateLabel } from '@/features/draw/reversalPresentation';
import { useAppTheme } from '@/theme/useAppTheme';

type TodayQuestionCardProps = {
  question: TodayQuestionSummary;
  timeZone: string;
  onEdit: () => void;
  onStart: () => void;
};

export function TodayQuestionCard({ question, timeZone, onEdit, onStart }: TodayQuestionCardProps) {
  const { theme } = useAppTheme();
  const lastRecordLabel = question.last_reading_at
    ? formatHomeDate(question.last_reading_at, timeZone)
    : '暂无历史记录';
  const lastCardLabel =
    question.last_cards.length > 0
      ? question.last_cards
          .map(
            (card) =>
              `${card.name_zh} · ${reversalStateLabel(card.orientation, card.reversalVariant)}`,
          )
          .join(' / ')
      : question.last_reading_at
        ? '上次记录没有有效牌面'
        : '暂无历史牌面';

  return (
    <GlassPanel variant="subtle">
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          justifyContent: 'space-between',
        }}
      >
        <MysticText variant="caption">{question.topic.title}</MysticText>
        <View
          accessibilityLabel={question.is_completed_today ? '今日已完成' : '今日待记录'}
          style={{
            backgroundColor: question.is_completed_today
              ? 'rgba(184, 224, 206, 0.14)'
              : 'rgba(181, 167, 234, 0.14)',
            borderRadius: theme.radii.pill,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <MysticText
            style={{
              color: question.is_completed_today ? theme.status.completed : theme.status.pending,
              fontWeight: '700',
            }}
            variant="caption"
          >
            {question.is_completed_today ? '今日已完成' : '今日待记录'}
          </MysticText>
        </View>
      </View>

      <MysticText variant="cardTitle">{question.question_template.question_text}</MysticText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <View style={{ flexBasis: 140, flexGrow: 1, gap: theme.spacing.xs }}>
          <MysticText variant="caption">上次记录</MysticText>
          <MysticText>{lastRecordLabel}</MysticText>
        </View>
        <View style={{ flexBasis: 190, flexGrow: 2, gap: theme.spacing.xs }}>
          <MysticText variant="caption">上次出现的牌</MysticText>
          <MysticText>{lastCardLabel}</MysticText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <MoonButton label="开始抽牌" onPress={onStart} />
        <MoonButton label="修改问题" onPress={onEdit} variant="ghost" />
      </View>
    </GlassPanel>
  );
}
