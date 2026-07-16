import { View } from 'react-native';
import { GlassPanel, MoonButton as Button, MysticText as Text } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';
import { formatFollowUpDate } from '../followUpDate';
import { dueStateLabels, outcomeLabels } from '../followUpPresentation';
import type { ReadingFollowUpListItem } from '../followUpTypes';

export function FollowUpListCard({
  item,
  timezone,
  onOpen,
  onReading,
  onSnooze7,
  onSnooze30,
}: {
  item: ReadingFollowUpListItem;
  timezone: string;
  onOpen(): void;
  onReading(): void;
  onSnooze7?: () => void;
  onSnooze30?: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <GlassPanel>
      <Text variant="eyebrow">{dueStateLabels[item.dueState]}</Text>
      <Text variant="subtitle">{item.questionText}</Text>
      <Text variant="muted">
        原记录：{formatFollowUpDate(item.readingAt, item.readingTimezone)}
      </Text>
      <Text>计划回顾：{formatFollowUpDate(item.followUp.scheduledFor, timezone)}</Text>
      {item.followUp.outcome ? <Text>{outcomeLabels[item.followUp.outcome]}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <Button
          label={item.followUp.status === 'completed' ? '查看回顾' : '完成回顾'}
          onPress={onOpen}
        />
        <Button label="返回原记录" onPress={onReading} variant="secondary" />
        {onSnooze7 ? <Button label="7 天后提醒" onPress={onSnooze7} variant="ghost" /> : null}
        {onSnooze30 ? <Button label="30 天后提醒" onPress={onSnooze30} variant="ghost" /> : null}
      </View>
    </GlassPanel>
  );
}
