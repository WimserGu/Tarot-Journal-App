import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Text';
import { borderRadii, colors, spacing } from '../../../theme/tokens';
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
  return (
    <View style={styles.card}>
      <Text variant="eyebrow">{dueStateLabels[item.dueState]}</Text>
      <Text variant="subtitle">{item.questionText}</Text>
      <Text variant="muted">
        原记录：{formatFollowUpDate(item.readingAt, item.readingTimezone)}
      </Text>
      <Text>计划回顾：{formatFollowUpDate(item.followUp.scheduledFor, timezone)}</Text>
      {item.followUp.outcome ? <Text>{outcomeLabels[item.followUp.outcome]}</Text> : null}
      <View style={styles.actions}>
        <Button
          label={item.followUp.status === 'completed' ? '查看回顾' : '完成回顾'}
          onPress={onOpen}
        />
        <Button label="返回原记录" onPress={onReading} />
        {onSnooze7 ? <Button label="7 天后提醒" onPress={onSnooze7} /> : null}
        {onSnooze30 ? <Button label="30 天后提醒" onPress={onSnooze30} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
