import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import {
  addFollowUpCalendarDays,
  formatFollowUpDate,
} from '../../src/features/followups/followUpDate';
import { outcomeLabels } from '../../src/features/followups/followUpPresentation';
import { reversalStateLabel } from '../../src/features/draw/reversalPresentation';
import { useFollowUpDetail } from '../../src/features/followups/useFollowUps';
import { followUpRepository } from '../../src/repositories/repositoryFactory';
import { colors, spacing } from '../../src/theme/tokens';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function FollowUpDetailScreen() {
  const router = useRouter();
  const id = first(useLocalSearchParams<{ followUpId?: string | string[] }>().followUpId);
  const { data, loading, error, reload } = useFollowUpDetail(id);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  if (loading)
    return (
      <Screen>
        <Text accessibilityRole="progressbar">正在加载回顾…</Text>
      </Screen>
    );
  if (error)
    return (
      <Screen>
        <Text>{error}</Text>
        <Button label="重试" onPress={() => void reload()} />
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <Text variant="subtitle">找不到这条回顾</Text>
        <Button label="返回列表" onPress={() => router.replace('/followups')} />
      </Screen>
    );

  const remove = async () => {
    setActing(true);
    setActionError(null);
    try {
      await followUpRepository.deleteFollowUp(data.followUp.id);
      router.replace('/followups');
    } catch (value) {
      setActionError(value instanceof Error ? value.message : '暂时无法删除回顾。');
    } finally {
      setActing(false);
    }
  };
  const snooze = async (days: 7 | 30) => {
    setActing(true);
    setActionError(null);
    try {
      await followUpRepository.snoozeFollowUp(
        data.followUp.id,
        addFollowUpCalendarDays(new Date().toISOString(), timezone, days),
      );
    } catch (value) {
      setActionError(value instanceof Error ? value.message : '暂时无法稍后提醒。');
    } finally {
      setActing(false);
    }
  };
  const confirmDelete = () =>
    Alert.alert('删除这条回顾？', '原 Reading 和其他回顾不会被删除。', [
      { text: '取消', style: 'cancel' },
      { text: '删除回顾', style: 'destructive', onPress: () => void remove() },
    ]);

  return (
    <Screen scroll>
      <Text variant="title">当前回顾</Text>
      <Text variant="muted">这是你对后来情况的记录，不是系统对塔罗准确性的判断。</Text>
      <View style={styles.section}>
        <Text variant="subtitle">当时的记录</Text>
        <Text>{data.reading.question_text}</Text>
        <Text variant="muted">
          {formatFollowUpDate(
            data.reading.reading.reading_at,
            data.reading.reading.reading_timezone,
          )}
        </Text>
        {data.reading.cards.map(({ reading_card: card, tarot_card: tarot }) => (
          <Text key={card.id}>
            {card.position_order}. {tarot?.name_zh ?? '未选牌'} ·{' '}
            {reversalStateLabel(card.orientation, card.reversalVariant)}
          </Text>
        ))}
        <Text>当时的总体解读：{data.reading.reading.interpretation ?? '未填写'}</Text>
        <Text>当时的后续反馈：{data.reading.reading.reality_feedback ?? '未填写'}</Text>
      </View>
      <View style={styles.section}>
        <Text variant="subtitle">后来发生的情况</Text>
        <Text>计划回顾：{formatFollowUpDate(data.followUp.scheduledFor, timezone)}</Text>
        {data.followUp.reviewedAt ? (
          <Text>实际回顾：{formatFollowUpDate(data.followUp.reviewedAt, timezone)}</Text>
        ) : null}
        <Text>{data.followUp.outcome ? outcomeLabels[data.followUp.outcome] : '仍待回顾'}</Text>
        <Text>{data.followUp.reflection ?? '尚未填写当前回顾。'}</Text>
      </View>
      {data.followUp.status === 'scheduled' ? (
        <>
          <Button
            label="完成回顾"
            disabled={acting}
            onPress={() =>
              router.push({
                pathname: '/followups/complete',
                params: { followUpId: data.followUp.id },
              })
            }
          />
          <View style={styles.actions}>
            <Button label="7 天后提醒" disabled={acting} onPress={() => void snooze(7)} />
            <Button label="30 天后提醒" disabled={acting} onPress={() => void snooze(30)} />
            <Button
              label="自定义日期"
              disabled={acting}
              onPress={() =>
                router.push({
                  pathname: '/followups/edit',
                  params: { followUpId: data.followUp.id },
                })
              }
            />
          </View>
        </>
      ) : (
        <Button
          label="编辑当前回顾"
          disabled={acting}
          onPress={() =>
            router.push({ pathname: '/followups/edit', params: { followUpId: data.followUp.id } })
          }
        />
      )}
      <Button
        label="返回原 Reading"
        onPress={() =>
          router.push({
            pathname: '/readings/[readingId]',
            params: { readingId: data.followUp.readingId },
          })
        }
      />
      <Button label="删除回顾" disabled={acting} onPress={confirmDelete} />
      {actionError ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {actionError}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.danger },
  section: { gap: spacing.sm },
});
