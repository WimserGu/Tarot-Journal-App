import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import {
  addFollowUpCalendarDays,
  customFollowUpDate,
  followUpDateInputValue,
} from '../../src/features/followups/followUpDate';
import { useReadingDetail } from '../../src/features/readings/useReadings';
import { followUpRepository } from '../../src/repositories/repositoryFactory';
import { borderRadii, colors, spacing } from '../../src/theme/tokens';

type Choice = '7' | '30' | 'custom';
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function NewFollowUpScreen() {
  const router = useRouter();
  const readingId = first(useLocalSearchParams<{ readingId?: string | string[] }>().readingId);
  const { data, is_loading: loading } = useReadingDetail(readingId);
  const [choice, setChoice] = useState<Choice>('7');
  const [customDate, setCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading)
    return (
      <Screen>
        <Text accessibilityRole="progressbar">正在加载原记录…</Text>
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <Text variant="subtitle">找不到原 Reading</Text>
        <Button label="返回" onPress={() => router.back()} />
      </Screen>
    );

  const preview =
    choice === 'custom'
      ? null
      : addFollowUpCalendarDays(
          data.reading.reading_at,
          data.reading.reading_timezone,
          Number(choice) as 7 | 30,
        );

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const scheduledFor =
        choice === 'custom'
          ? customFollowUpDate(customDate, data.reading.reading_at, data.reading.reading_timezone)
          : preview!;
      const created = await followUpRepository.createFollowUp({
        readingId: data.reading.id,
        scheduledFor,
      });
      router.replace({ pathname: '/followups/[followUpId]', params: { followUpId: created.id } });
    } catch (value) {
      setError(value instanceof Error ? value.message : '暂时无法安排回顾。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="title">安排回顾</Text>
      <Text>{data.question_text}</Text>
      <Text variant="muted">
        日期以原 Reading 的 {data.reading.reading_timezone} 当地日历计算。
      </Text>
      <View style={styles.actions}>
        <Button label="7 天后" onPress={() => setChoice('7')} />
        <Button label="30 天后" onPress={() => setChoice('30')} />
        <Button label="自定义日期" onPress={() => setChoice('custom')} />
      </View>
      {choice === 'custom' ? (
        <View style={styles.field}>
          <Text nativeID="custom-date-label">回顾日期（YYYY-MM-DD）</Text>
          <TextInput
            accessibilityLabelledBy="custom-date-label"
            autoCapitalize="none"
            placeholder="2026-08-01"
            style={styles.input}
            value={customDate}
            onChangeText={setCustomDate}
          />
        </View>
      ) : (
        <Text>计划日期：{followUpDateInputValue(preview!, data.reading.reading_timezone)}</Text>
      )}
      <Text variant="muted">创建提醒时不需要填写结果；同一 Reading 可以安排多次回顾。</Text>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={submitting ? '正在保存…' : '保存回顾提醒'}
        disabled={submitting}
        onPress={() => void submit()}
      />
      <Button label="取消" disabled={submitting} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.danger },
  field: { gap: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
});
