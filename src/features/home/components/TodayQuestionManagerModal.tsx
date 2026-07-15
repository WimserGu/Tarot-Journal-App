import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GlassPanel, MoonButton, MysticText } from '@/components/mystic';
import type { QuestionTemplate, Topic } from '@/domain/types';
import { saveTodayQuestion } from '@/features/questions/todayQuestionCoordinator';
import { questionTemplateRepository } from '@/repositories/repositoryFactory';
import { useAppTheme } from '@/theme/useAppTheme';

export function TodayQuestionManagerModal({
  editing,
  onClose,
  onSaved,
  topics,
  visible,
}: {
  editing: QuestionTemplate | null;
  onClose: () => void;
  onSaved: (template: QuestionTemplate) => void;
  topics: readonly Topic[];
  visible: boolean;
}) {
  const { theme } = useAppTheme();
  const [questionText, setQuestionText] = useState('今日日运如何？');
  const [topicId, setTopicId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuestionText(editing?.question_text ?? '今日日运如何？');
    setTopicId(editing?.topic_id ?? topics[0]?.id ?? '');
    setFrequency(editing?.frequency === 'weekly' ? 'weekly' : 'daily');
    setError(null);
  }, [editing, topics, visible]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveTodayQuestion(questionTemplateRepository, {
        frequency,
        questionText,
        topicId,
        template: editing ?? undefined,
      });
      onSaved(saved);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '暂时无法保存固定问题。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <GlassPanel style={styles.panel} variant="elevated">
          <MysticText variant="pageTitle">{editing ? '修改固定问题' : '添加固定问题'}</MysticText>
          <MysticText variant="caption">固定问题会按相同模板汇总历史牌面。</MysticText>
          <MysticText variant="cardTitle">问题</MysticText>
          <TextInput
            accessibilityLabel="固定问题内容"
            autoFocus
            multiline
            onChangeText={setQuestionText}
            placeholder="例如：今日日运如何？"
            placeholderTextColor={theme.colors.textMuted}
            style={{
              backgroundColor: theme.colors.glassSubtle,
              borderColor: theme.colors.glassBorder,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.body,
              minHeight: 92,
              padding: theme.spacing.md,
              textAlignVertical: 'top',
            }}
            value={questionText}
          />
          <MysticText variant="cardTitle">所属 Topic</MysticText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {topics.map((topic) => {
              const selected = topicId === topic.id;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ disabled: editing !== null, selected }}
                  disabled={editing !== null}
                  key={topic.id}
                  onPress={() => setTopicId(topic.id)}
                  style={({ pressed }) => ({
                    backgroundColor: selected ? theme.colors.primary : theme.colors.glassSubtle,
                    borderColor: selected ? theme.colors.primarySoft : theme.colors.glassBorder,
                    borderRadius: theme.radii.pill,
                    borderWidth: 1,
                    minHeight: 42,
                    justifyContent: 'center',
                    opacity: editing ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
                    paddingHorizontal: theme.spacing.md,
                  })}
                >
                  <MysticText variant="caption">{topic.title}</MysticText>
                </Pressable>
              );
            })}
          </View>
          <MysticText variant="cardTitle">提醒频率</MysticText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {(
              [
                ['daily', '每日'],
                ['weekly', '每周'],
              ] as const
            ).map(([value, label]) => {
              const selected = frequency === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={value}
                  onPress={() => setFrequency(value)}
                  style={({ pressed }) => ({
                    backgroundColor: selected ? theme.colors.primary : theme.colors.glassSubtle,
                    borderColor: selected ? theme.colors.primarySoft : theme.colors.glassBorder,
                    borderRadius: theme.radii.pill,
                    borderWidth: 1,
                    minHeight: 42,
                    justifyContent: 'center',
                    opacity: pressed ? theme.opacity.pressed : 1,
                    paddingHorizontal: theme.spacing.md,
                  })}
                >
                  <MysticText variant="caption">{label}</MysticText>
                </Pressable>
              );
            })}
          </View>
          {topics.length === 0 ? (
            <MysticText style={{ color: theme.colors.danger }}>请先创建一个 Topic。</MysticText>
          ) : null}
          {error ? <MysticText style={{ color: theme.colors.danger }}>{error}</MysticText> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <MoonButton
              disabled={saving || !questionText.trim() || !topicId}
              label="保存问题"
              loading={saving}
              onPress={() => void save()}
            />
            <MoonButton disabled={saving} label="取消" onPress={onClose} variant="ghost" />
          </View>
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20 },
  panel: { alignSelf: 'center', maxWidth: 680, width: '100%' },
});
