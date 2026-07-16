import { useState } from 'react';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { TextInput, StyleSheet } from 'react-native';
import {
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import { useAuth } from '@/features/auth/AuthProvider';
import { questionTemplateRepository, topicRepository } from '@/repositories/repositoryFactory';
import type { AppTheme } from '@/theme/types';
import { useAppTheme } from '@/theme/useAppTheme';
export default function OnboardingScreen() {
  const router = useRouter();
  const styles = useOnboardingStyles();
  const { theme } = useAppTheme();
  const pathname = usePathname();
  const { review } = useLocalSearchParams<{ review?: string }>();
  const reviewMode = review === '1' || pathname.endsWith('onboarding-review');
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [topicName, setTopicName] = useState('');
  const [question, setQuestion] = useState('今日日运如何？');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    await completeOnboarding();
    router.replace('/');
  };
  const createTopic = async () => {
    if (!topicName.trim()) {
      setError('请输入第一个 Topic 名称，或选择跳过。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const topic = await topicRepository.createTopic({
        name: topicName,
        description: '',
        icon: 'sparkles',
        isPinned: false,
      });
      setTopicId(topic.id);
      setStep(2);
    } catch {
      setError('暂时无法创建 Topic，输入内容已保留。');
    } finally {
      setBusy(false);
    }
  };
  const createQuestion = async () => {
    if (!topicId) return finish();
    if (!question.trim()) {
      setError('请输入固定问题，或选择跳过。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await questionTemplateRepository.createQuestionTemplate({
        topic_id: topicId,
        question_text: question,
        frequency: 'daily',
        is_active: true,
        is_pinned: false,
        position_names: [],
      });
      await finish();
    } catch {
      setError('暂时无法创建固定问题，输入内容已保留。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen maxWidth={680} scroll>
      <MysticHeader
        eyebrow={reviewMode ? '重新查看引导' : '首次使用'}
        subtitle={`步骤 ${step + 1} / 3`}
        title="建立你的长期记录空间"
      />
      <GlassPanel variant="elevated">
        {step === 0 ? (
          <>
            <Text variant="title">把长期问题变成可回看的记录</Text>
            <Text>创建 Topic 来组织关注方向，用固定问题追踪重复出现的牌与现实反馈。</Text>
            <Button label="开始" onPress={() => setStep(1)} />
            <Button
              label={reviewMode ? '退出引导' : '跳过引导'}
              onPress={() => void finish()}
              variant="ghost"
            />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Text variant="title">创建第一个 Topic</Text>
            <TextInput
              accessibilityLabel="Topic 名称"
              value={topicName}
              onChangeText={setTopicName}
              placeholder="例如：职业方向"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
            <Button
              disabled={busy}
              label={busy ? '正在创建…' : '创建并继续'}
              onPress={() => void createTopic()}
            />
            <Button label="跳过 Topic" onPress={() => setStep(2)} variant="ghost" />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text variant="title">创建第一个固定问题</Text>
            {topicId ? (
              <>
                <TextInput
                  accessibilityLabel="固定问题"
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="例如：本周最需要关注什么？"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                />
                <Button
                  disabled={busy}
                  label={busy ? '正在创建…' : '创建并完成'}
                  onPress={() => void createQuestion()}
                />
              </>
            ) : (
              <Text variant="muted">你跳过了 Topic，可以稍后在 Topics 中创建。</Text>
            )}
            <Button label="跳过并完成" onPress={() => void finish()} variant="ghost" />
          </>
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
            {error}
          </Text>
        ) : null}
      </GlassPanel>
    </Screen>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    input: {
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: theme.borders.hairline,
      color: theme.colors.textPrimary,
      minHeight: 50,
      paddingHorizontal: theme.spacing.md,
    },
  });
}

function useOnboardingStyles() {
  const { theme } = useAppTheme();
  return createStyles(theme);
}
