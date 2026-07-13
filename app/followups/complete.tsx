import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { FollowUpOutcome } from '../../src/domain/types';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { outcomeLabels } from '../../src/features/followups/followUpPresentation';
import { useFollowUpDetail } from '../../src/features/followups/useFollowUps';
import { followUpRepository } from '../../src/repositories/repositoryFactory';
import { borderRadii, colors, spacing } from '../../src/theme/tokens';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const outcomes = Object.keys(outcomeLabels) as FollowUpOutcome[];

export default function CompleteFollowUpScreen() {
  const router = useRouter();
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
    <Screen scroll>
      <Text variant="title">后来发生了什么</Text>
      <Text>{data.reading.question_text}</Text>
      <Text variant="muted">这是你对后来情况的分类，不是系统判断塔罗准确性。</Text>
      <View style={styles.actions}>
        {outcomes.map((value) => (
          <Button key={value} label={outcomeLabels[value]} onPress={() => setOutcome(value)} />
        ))}
      </View>
      <Text nativeID="reflection-label">当前回顾（可选）</Text>
      <TextInput
        accessibilityLabelledBy="reflection-label"
        multiline
        maxLength={5000}
        style={styles.input}
        textAlignVertical="top"
        value={reflection}
        onChangeText={setReflection}
      />
      <Text variant="muted">{reflection.length}/5000；内容不会被自动改写或分类。</Text>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={submitting ? '正在保存…' : '完成回顾'}
        disabled={submitting}
        onPress={() => void submit()}
      />
      <Button label="取消" disabled={submitting} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  error: { color: colors.danger },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    minHeight: 144,
    padding: spacing.md,
  },
});
