import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import {
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import {
  addFollowUpCalendarDays,
  customFollowUpDate,
  followUpDateInputValue,
} from '../../src/features/followups/followUpDate';
import { useReadingDetail } from '../../src/features/readings/useReadings';
import { followUpRepository } from '../../src/repositories/repositoryFactory';
import { useAppTheme } from '@/theme/useAppTheme';

type Choice = '7' | '30' | 'custom';
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function NewFollowUpScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
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
    <Screen maxWidth={720} scroll>
      <MysticHeader
        onBack={() => router.back()}
        subtitle={`日期以原 Reading 的 ${data.reading.reading_timezone} 当地日历计算。`}
        title="安排回顾"
      />
      <GlassPanel variant="elevated">
        <Text variant="sectionTitle">{data.question_text}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Button
            label="7 天后"
            onPress={() => setChoice('7')}
            variant={choice === '7' ? 'primary' : 'secondary'}
          />
          <Button
            label="30 天后"
            onPress={() => setChoice('30')}
            variant={choice === '30' ? 'primary' : 'secondary'}
          />
          <Button
            label="自定义日期"
            onPress={() => setChoice('custom')}
            variant={choice === 'custom' ? 'primary' : 'secondary'}
          />
        </View>
        {choice === 'custom' ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Text nativeID="custom-date-label">回顾日期（YYYY-MM-DD）</Text>
            <TextInput
              accessibilityLabelledBy="custom-date-label"
              autoCapitalize="none"
              placeholder="2026-08-01"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                backgroundColor: theme.colors.glassSubtle,
                borderColor: theme.colors.glassBorder,
                borderRadius: theme.radii.md,
                borderWidth: theme.borders.hairline,
                color: theme.colors.textPrimary,
                minHeight: 48,
                paddingHorizontal: theme.spacing.md,
              }}
              value={customDate}
              onChangeText={setCustomDate}
            />
          </View>
        ) : (
          <Text>计划日期：{followUpDateInputValue(preview!, data.reading.reading_timezone)}</Text>
        )}
        <Text variant="muted">创建提醒时不需要填写结果；同一 Reading 可以安排多次回顾。</Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
            {error}
          </Text>
        ) : null}
        <Button label="保存回顾提醒" loading={submitting} onPress={() => void submit()} />
        <Button label="取消" disabled={submitting} onPress={() => router.back()} variant="ghost" />
      </GlassPanel>
    </Screen>
  );
}
