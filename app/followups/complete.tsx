import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { FollowUpOutcome } from '../../src/domain/types';
import {
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import { outcomeLabels } from '../../src/features/followups/followUpPresentation';
import { useFollowUpDetail } from '../../src/features/followups/useFollowUps';
import { followUpRepository } from '../../src/repositories/repositoryFactory';
import { useAppTheme } from '@/theme/useAppTheme';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const outcomes = Object.keys(outcomeLabels) as FollowUpOutcome[];

export default function CompleteFollowUpScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const id = first(useLocalSearchParams<{ followUpId?: string | string[] }>().followUpId);
  const { data, loading } = useFollowUpDetail(id);
  const [outcome, setOutcome] = useState<FollowUpOutcome | null>(null);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!outcome) {
      setError('请选择后来情况分类。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await followUpRepository.completeFollowUp(data.followUp.id, {
        outcome,
        reflection,
        reviewedAt: new Date().toISOString(),
      });
      router.replace({
        pathname: '/followups/[followUpId]',
        params: { followUpId: data.followUp.id },
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : '暂时无法完成回顾。');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Screen maxWidth={720} scroll>
      <MysticHeader
        onBack={() => router.back()}
        subtitle="这是你对后来情况的分类，不是系统判断塔罗准确性。"
        title="后来发生了什么"
      />
      <GlassPanel variant="elevated">
        <Text variant="sectionTitle">{data.reading.question_text}</Text>
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
        <Text nativeID="reflection-label">当前回顾（可选）</Text>
        <TextInput
          accessibilityLabelledBy="reflection-label"
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
        <Text variant="muted">{reflection.length}/5000；内容不会被自动改写或分类。</Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
            {error}
          </Text>
        ) : null}
        <Button label="完成回顾" loading={submitting} onPress={() => void submit()} />
        <Button label="取消" disabled={submitting} onPress={() => router.back()} variant="ghost" />
      </GlassPanel>
    </Screen>
  );
}
