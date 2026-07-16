import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import type { FollowUpOutcome } from '../../src/domain/types';
import {
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import {
  customFollowUpDate,
  followUpDateInputValue,
} from '../../src/features/followups/followUpDate';
import { outcomeLabels } from '../../src/features/followups/followUpPresentation';
import { useFollowUpDetail } from '../../src/features/followups/useFollowUps';
import { followUpRepository } from '../../src/repositories/repositoryFactory';
import { useAppTheme } from '@/theme/useAppTheme';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const outcomes = Object.keys(outcomeLabels) as FollowUpOutcome[];

export default function EditFollowUpScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const id = first(useLocalSearchParams<{ followUpId?: string | string[] }>().followUpId);
  const { data, loading } = useFollowUpDetail(id);
  const [date, setDate] = useState('');
  const [outcome, setOutcome] = useState<FollowUpOutcome | null>(null);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!data) return;
    setDate(
      followUpDateInputValue(data.followUp.scheduledFor, data.reading.reading.reading_timezone),
    );
    setOutcome(data.followUp.outcome);
    setReflection(data.followUp.reflection ?? '');
  }, [data]);
  if (loading)
    return (
      <Screen>
        <Text accessibilityRole="progressbar">正在加载…</Text>
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <Text>找不到这条回顾。</Text>
        <Button label="返回" onPress={() => router.back()} />
      </Screen>
    );
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (data.followUp.status === 'scheduled') {
        await followUpRepository.updateFollowUp(data.followUp.id, {
          scheduledFor: customFollowUpDate(
            date,
            data.reading.reading.reading_at,
            data.reading.reading.reading_timezone,
          ),
        });
      } else {
        if (!outcome) throw new Error('请选择后来情况分类。');
        await followUpRepository.updateFollowUp(data.followUp.id, { outcome, reflection });
      }
      router.replace({
        pathname: '/followups/[followUpId]',
        params: { followUpId: data.followUp.id },
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : '暂时无法保存修改。');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Screen maxWidth={720} scroll>
      <MysticHeader onBack={() => router.back()} title="编辑回顾" />
      <GlassPanel variant="elevated">
        {data.followUp.status === 'scheduled' ? (
          <>
            <Text nativeID="edit-date-label">计划回顾日期（YYYY-MM-DD）</Text>
            <TextInput
              accessibilityLabelledBy="edit-date-label"
              style={{
                backgroundColor: theme.colors.glassSubtle,
                borderColor: theme.colors.glassBorder,
                borderRadius: theme.radii.md,
                borderWidth: theme.borders.hairline,
                color: theme.colors.textPrimary,
                minHeight: 48,
                padding: theme.spacing.md,
              }}
              value={date}
              onChangeText={setDate}
            />
            <Text variant="muted">修改的是同一条提醒，不会创建重复 Follow-Up。</Text>
          </>
        ) : (
          <>
            <View style={{ gap: theme.spacing.sm }}>
              {outcomes.map((value) => (
                <Button
                  key={value}
                  label={outcomeLabels[value]}
                  onPress={() => setOutcome(value)}
                  variant={outcome === value ? 'primary' : 'secondary'}
                />
              ))}
            </View>
            <Text nativeID="edit-reflection-label">当前回顾（可选）</Text>
            <TextInput
              accessibilityLabelledBy="edit-reflection-label"
              multiline
              maxLength={5000}
              style={{
                backgroundColor: theme.colors.glassSubtle,
                borderColor: theme.colors.glassBorder,
                borderRadius: theme.radii.md,
                borderWidth: theme.borders.hairline,
                color: theme.colors.textPrimary,
                minHeight: 144,
                padding: theme.spacing.md,
              }}
              textAlignVertical="top"
              value={reflection}
              onChangeText={setReflection}
            />
          </>
        )}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
            {error}
          </Text>
        ) : null}
        <Button label="保存修改" loading={submitting} onPress={() => void submit()} />
        <Button label="取消" disabled={submitting} onPress={() => router.back()} variant="ghost" />
      </GlassPanel>
    </Screen>
  );
}
