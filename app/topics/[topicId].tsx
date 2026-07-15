import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { reversalStateLabel } from '@/features/draw/reversalPresentation';
import { TopicIcon } from '@/features/topics/components/TopicIcon';
import { questionFrequencyLabels } from '@/features/topics/topicConstants';
import {
  questionTagRepository,
  readingRepository,
  topicRepository,
} from '@/repositories/repositoryFactory';
import type { QuestionTag } from '@/domain/types';
import type { ReadingTimelineItem } from '@/features/readings/readingRepository';
import {
  assignQuestionTagToReadings,
  toggleSelectedReading,
} from '@/features/questionTags/batchQuestionTagCoordinator';
import { addRelationshipQuestionTagPresets } from '@/features/questionTags/questionTagPresets';
import {
  normalizeQuestionTagName,
  RELATIONSHIP_QUESTION_TAG_PRESETS,
  type RelationshipQuestionTagPreset,
} from '@/features/questionTags/questionTagRepository';
import { formatTopicDate, getCurrentTimeZone } from '@/features/topics/topicPresentation';
import type { TopicDeletionSummary } from '@/features/topics/topicRepository';
import { useTopicDetail } from '@/features/topics/useTopics';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function deletionMessage(summary: TopicDeletionSummary): string {
  return `将永久删除“${summary.topic_title}”、${summary.question_count} 个固定问题、${summary.reading_count} 条记录和 ${summary.reading_card_count} 张已录入牌面。此操作无法恢复。`;
}

function readingCardLabel(reading: ReadingTimelineItem): string {
  if (reading.cards.length === 0) {
    return '尚未选择牌面';
  }

  return reading.cards
    .map((card) => {
      const position = card.position_name ? `${card.position_name}：` : '';
      return `${position}${card.tarot_card?.name_zh ?? '未选择牌面'} · ${reversalStateLabel(card.orientation, card.reversalVariant)}`;
    })
    .join(' / ');
}

function createOptimisticQuestionTag(topicId: string, userId: string, name: string): QuestionTag {
  const normalizedName = normalizeQuestionTagName(name);
  const now = new Date().toISOString();
  return {
    id: `optimistic-question-tag-${normalizedName}`,
    user_id: userId,
    topic_id: topicId,
    name: name.trim(),
    normalized_name: normalizedName,
    created_at: now,
    updated_at: now,
  };
}

function mergeQuestionTags(
  current: readonly QuestionTag[],
  incoming: readonly QuestionTag[],
): QuestionTag[] {
  const incomingNames = new Set(incoming.map((tag) => tag.normalized_name));
  return [...current.filter((tag) => !incomingNames.has(tag.normalized_name)), ...incoming].sort(
    (left, right) => left.name.localeCompare(right.name, 'zh-CN'),
  );
}

export default function TopicDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const topicId = firstRouteParam(params.topicId);
  const {
    data: detail,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useTopicDetail(topicId);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [questionTags, setQuestionTags] = useState<QuestionTag[]>([]);
  const [tagName, setTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [isSavingTag, setSavingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<Set<RelationshipQuestionTagPreset>>(
    () => new Set(),
  );
  const [topicReadings, setTopicReadings] = useState<ReadingTimelineItem[]>([]);
  const [isBatchSelecting, setBatchSelecting] = useState(false);
  const [selectedReadingIds, setSelectedReadingIds] = useState<Set<string>>(() => new Set());
  const [batchQuestionTagId, setBatchQuestionTagId] = useState<string | null>(null);
  const [isApplyingBatchTag, setApplyingBatchTag] = useState(false);
  const [batchTagError, setBatchTagError] = useState<string | null>(null);
  const timeZone = getCurrentTimeZone();

  const loadQuestionTags = useCallback(async () => {
    if (!topicId) return;
    setQuestionTags(await questionTagRepository.listQuestionTags(topicId));
  }, [topicId]);

  const loadTopicReadings = useCallback(async () => {
    if (!topicId) return;
    setTopicReadings(await readingRepository.listReadings({ topic_id: topicId }));
  }, [topicId]);

  useEffect(() => {
    void loadQuestionTags().catch((error: unknown) =>
      setTagError(error instanceof Error ? error.message : '无法加载问题标签。'),
    );
    return questionTagRepository.subscribe(() => void loadQuestionTags());
  }, [loadQuestionTags]);

  useEffect(() => {
    void loadTopicReadings().catch((error: unknown) =>
      setBatchTagError(error instanceof Error ? error.message : '无法加载 Topic 记录。'),
    );
    return readingRepository.subscribe(() => void loadTopicReadings());
  }, [loadTopicReadings]);

  const createTag = async (name: string) => {
    if (!detail || isSavingTag) return;
    const previousTags = questionTags;
    const optimisticTag = createOptimisticQuestionTag(detail.topic.id, detail.topic.user_id, name);
    setSavingTag(true);
    setTagError(null);
    setQuestionTags((current) => mergeQuestionTags(current, [optimisticTag]));
    try {
      const savedTag = await questionTagRepository.createOrReuseQuestionTag({
        topic_id: detail.topic.id,
        name,
      });
      setQuestionTags((current) => mergeQuestionTags(current, [savedTag]));
      setTagName('');
    } catch (error) {
      setQuestionTags(previousTags);
      setTagError(error instanceof Error ? error.message : '无法创建问题标签。');
    } finally {
      setSavingTag(false);
    }
  };

  const addRelationshipPresets = async () => {
    if (!detail || isSavingTag || selectedPresets.size === 0) return;
    const presets = [...selectedPresets];
    const optimisticTags = presets.map((name) =>
      createOptimisticQuestionTag(detail.topic.id, detail.topic.user_id, name),
    );
    setSavingTag(true);
    setTagError(null);
    setQuestionTags((current) => mergeQuestionTags(current, optimisticTags));
    try {
      const savedTags = await addRelationshipQuestionTagPresets(
        questionTagRepository,
        detail.topic.id,
        presets,
      );
      setQuestionTags((current) => mergeQuestionTags(current, savedTags));
      setSelectedPresets(new Set());
    } catch (error) {
      await loadQuestionTags().catch(() => undefined);
      setTagError(error instanceof Error ? error.message : '无法添加推荐标签。');
    } finally {
      setSavingTag(false);
    }
  };

  const togglePreset = (preset: RelationshipQuestionTagPreset) => {
    setSelectedPresets((current) => {
      const next = new Set(current);
      if (next.has(preset)) next.delete(preset);
      else next.add(preset);
      return next;
    });
  };

  const deleteTag = async (tag: QuestionTag) => {
    if (deletingTagId || isSavingTag) return;
    const previousTags = questionTags;
    setDeletingTagId(tag.id);
    setTagError(null);
    setQuestionTags((current) => current.filter((item) => item.id !== tag.id));
    try {
      await questionTagRepository.deleteQuestionTag(tag.id);
    } catch (error) {
      setQuestionTags(previousTags);
      setTagError(error instanceof Error ? error.message : '无法删除问题标签。');
    } finally {
      setDeletingTagId(null);
    }
  };

  const cancelBatchSelection = () => {
    if (isApplyingBatchTag) return;
    setBatchSelecting(false);
    setSelectedReadingIds(new Set());
    setBatchQuestionTagId(null);
    setBatchTagError(null);
  };

  const applyBatchQuestionTag = async () => {
    if (!detail || !batchQuestionTagId || isApplyingBatchTag) return;
    setApplyingBatchTag(true);
    setBatchTagError(null);
    try {
      await assignQuestionTagToReadings(readingRepository, {
        topic_id: detail.topic.id,
        question_tag_id: batchQuestionTagId,
        reading_ids: [...selectedReadingIds],
      });
      await Promise.all([loadTopicReadings(), reload()]);
      setBatchSelecting(false);
      setSelectedReadingIds(new Set());
      setBatchQuestionTagId(null);
    } catch (error) {
      setBatchTagError(error instanceof Error ? error.message : '无法批量添加问题标签。');
    } finally {
      setApplyingBatchTag(false);
    }
  };

  const deleteTopic = async () => {
    if (!detail) {
      return;
    }

    setDeleteError(null);

    try {
      await topicRepository.deleteTopic(detail.topic.id);
      router.replace('/topics');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '暂时无法删除这个长期议题。');
    }
  };

  const confirmDelete = () => {
    if (!detail) {
      return;
    }

    Alert.alert('删除长期议题？', deletionMessage(detail.deletion_summary), [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => void deleteTopic() },
    ]);
  };

  if (isLoading) {
    return (
      <Screen>
        <Text variant="muted">正在加载议题…</Text>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen>
        <Text>{errorMessage}</Text>
        <Button label="重新加载" onPress={() => void reload()} />
        <Button label="返回议题列表" onPress={() => router.replace('/topics')} />
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen>
        <Text variant="subtitle">找不到这个长期议题</Text>
        <Button label="返回议题列表" onPress={() => router.replace('/topics')} />
      </Screen>
    );
  }

  const isRelationshipTopic = detail.topic.icon === 'heart' || detail.topic.title.includes('关系');

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <IconButton
          accessibilityLabel="返回议题列表"
          icon="arrow-back"
          onPress={() => router.back()}
        />
        <View style={styles.topActions}>
          <IconButton
            accessibilityLabel="编辑议题"
            icon="pencil-outline"
            onPress={() =>
              router.push({ pathname: '/topics/edit', params: { topicId: detail.topic.id } })
            }
          />
          <IconButton
            accessibilityLabel="删除议题"
            icon="trash-outline"
            onPress={confirmDelete}
            tone="danger"
          />
        </View>
      </View>

      <View style={styles.topicHeader}>
        <View style={styles.topicIconBox}>
          <TopicIcon icon={detail.topic.icon} size={30} />
        </View>
        <View style={styles.topicCopy}>
          <View style={styles.titleRow}>
            <Text variant="title">{detail.topic.title}</Text>
            {detail.topic.is_pinned ? <Text style={styles.pinnedLabel}>已置顶</Text> : null}
          </View>
          {detail.topic.description ? <Text>{detail.topic.description}</Text> : null}
          <Text variant="muted">
            创建于 {formatTopicDate(detail.topic.created_at, timeZone)} · 更新于{' '}
            {formatTopicDate(detail.topic.updated_at, timeZone)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label="新增记录"
          onPress={() =>
            router.push({ pathname: '/readings/new', params: { topicId: detail.topic.id } })
          }
        />
        <Button
          label="新增固定问题"
          onPress={() =>
            router.push({ pathname: '/questions/new', params: { topicId: detail.topic.id } })
          }
        />
        <Button
          label="查看时间线"
          onPress={() =>
            router.push({ pathname: '/topics/timeline', params: { topicId: detail.topic.id } })
          }
        />
      </View>

      <View style={styles.statRow}>
        <Text variant="subtitle">总记录数</Text>
        <Text style={styles.statValue}>{detail.record_count}</Text>
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">最常出现的牌</Text>
        {detail.most_frequent_cards.length > 0 ? (
          detail.most_frequent_cards.map((card) => (
            <Text key={card.tarot_card.id}>
              {card.tarot_card.name_zh} · {card.occurrence_count} 次
            </Text>
          ))
        ) : (
          <Text variant="muted">保存牌面后，这里会显示出现次数最高的牌。</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">固定问题</Text>
        <View style={styles.tagPanel}>
          <Text variant="subtitle">问题标签</Text>
          <Text variant="muted">标签仅在“{detail.topic.title}”内使用，不会与其他 Topic 混合。</Text>
          <View style={styles.tagWrap}>
            {questionTags.length > 0 ? (
              questionTags.map((tag) => (
                <View key={tag.id} style={styles.tagChip}>
                  <Text>{tag.name}</Text>
                  <Pressable
                    accessibilityLabel={`删除标签${tag.name}`}
                    accessibilityRole="button"
                    disabled={deletingTagId !== null || isSavingTag}
                    hitSlop={8}
                    onPress={() => void deleteTag(tag)}
                    style={({ pressed }) => [
                      styles.tagDeleteButton,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Ionicons color={colors.danger} name="close" size={14} />
                  </Pressable>
                </View>
              ))
            ) : (
              <Text variant="muted">还没有问题标签。</Text>
            )}
          </View>
          <TextInput
            accessibilityLabel="新问题标签名称"
            editable={!isSavingTag}
            maxLength={40}
            onChangeText={setTagName}
            placeholder="例如：对方的想法"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={tagName}
          />
          <View style={styles.actions}>
            <Button
              disabled={isSavingTag || tagName.trim().length === 0}
              label={isSavingTag ? '正在保存…' : '添加标签'}
              onPress={() => void createTag(tagName)}
            />
            {isRelationshipTopic ? (
              <Button
                disabled={isSavingTag || selectedPresets.size === 0}
                label="一键添加推荐标签"
                onPress={() => void addRelationshipPresets()}
              />
            ) : null}
          </View>
          {isRelationshipTopic ? (
            <View style={styles.recommendationPanel}>
              <Text variant="muted">推荐标签（可多选）</Text>
              <View style={styles.tagWrap}>
                {RELATIONSHIP_QUESTION_TAG_PRESETS.map((preset) => {
                  const isAdded = questionTags.some((tag) => tag.name === preset);
                  const isSelected = selectedPresets.has(preset);
                  return (
                    <Pressable
                      accessibilityLabel={`${isAdded ? '已添加' : isSelected ? '取消选择' : '选择'}推荐标签${preset}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isAdded || isSelected, disabled: isAdded }}
                      disabled={isAdded || isSavingTag}
                      key={preset}
                      onPress={() => togglePreset(preset)}
                      style={({ pressed }) => [
                        styles.recommendationTab,
                        isSelected ? styles.recommendationTabSelected : null,
                        isAdded ? styles.recommendationTabAdded : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={isSelected ? styles.recommendationTabTextSelected : undefined}>
                        {preset}
                        {isAdded ? ' · 已添加' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {tagError ? <Text style={styles.errorText}>{tagError}</Text> : null}
        </View>
        {detail.fixed_questions.length > 0 ? (
          detail.fixed_questions.map((question) => (
            <View key={question.id} style={styles.rowCard}>
              <Text>{question.question_text}</Text>
              <Text variant="muted">
                {questionFrequencyLabels[question.frequency]} ·{' '}
                {question.is_active ? '启用中' : '已停用'}
              </Text>
              <Pressable
                accessibilityLabel={`查看${question.question_text}的历史记录`}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/questions/history',
                    params: { questionTemplateId: question.id, topicId: detail.topic.id },
                  })
                }
                style={({ pressed }) => [styles.historyLink, pressed ? styles.pressed : null]}
              >
                <Text style={styles.historyLinkLabel}>查看同题历史</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text variant="muted">还没有固定问题。</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.recordHeader}>
          <Text variant="subtitle">记录</Text>
          {!isBatchSelecting ? (
            <Button
              disabled={topicReadings.length === 0}
              label="批量添加标签"
              onPress={() => setBatchSelecting(true)}
            />
          ) : null}
        </View>
        {isBatchSelecting ? (
          <View style={styles.batchPanel}>
            <Text>已选择 {selectedReadingIds.size} 条记录</Text>
            <Text variant="muted">选择一个问题标签。已有标签会被新标签替换。</Text>
            <View style={styles.tagWrap}>
              {questionTags.map((tag) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: batchQuestionTagId === tag.id }}
                  key={tag.id}
                  onPress={() => setBatchQuestionTagId(tag.id)}
                  style={[
                    styles.recommendationTab,
                    batchQuestionTagId === tag.id ? styles.recommendationTabSelected : null,
                  ]}
                >
                  <Text
                    style={
                      batchQuestionTagId === tag.id
                        ? styles.recommendationTabTextSelected
                        : undefined
                    }
                  >
                    {tag.name}
                  </Text>
                </Pressable>
              ))}
              {questionTags.length === 0 ? (
                <Text variant="muted">请先在上方创建问题标签。</Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              <Button
                disabled={
                  isApplyingBatchTag || selectedReadingIds.size === 0 || !batchQuestionTagId
                }
                label={isApplyingBatchTag ? '正在添加…' : '添加到所选记录'}
                onPress={() => void applyBatchQuestionTag()}
              />
              <Button
                disabled={isApplyingBatchTag}
                label="取消批量选择"
                onPress={cancelBatchSelection}
              />
            </View>
            {batchTagError ? <Text style={styles.errorText}>{batchTagError}</Text> : null}
          </View>
        ) : null}
        {topicReadings.length > 0 ? (
          topicReadings.map((reading) => (
            <Pressable
              accessibilityHint={
                isBatchSelecting ? '选择或取消选择这条记录' : '打开这条塔罗记录的详情'
              }
              accessibilityLabel={`${isBatchSelecting ? '选择' : '查看'}记录：${reading.question_text}`}
              accessibilityRole={isBatchSelecting ? 'checkbox' : 'button'}
              accessibilityState={
                isBatchSelecting
                  ? { checked: selectedReadingIds.has(reading.reading.id) }
                  : undefined
              }
              key={reading.reading.id}
              onPress={() => {
                if (isBatchSelecting) {
                  setSelectedReadingIds((current) =>
                    toggleSelectedReading(current, reading.reading.id),
                  );
                  return;
                }
                router.push({
                  pathname: '/readings/[readingId]',
                  params: { readingId: reading.reading.id },
                });
              }}
              style={({ pressed }) => [
                styles.rowCard,
                selectedReadingIds.has(reading.reading.id) ? styles.rowCardSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.recordHeader}>
                <Text>{formatTopicDate(reading.reading.reading_at, timeZone)}</Text>
                <View style={styles.recordAction}>
                  {isBatchSelecting ? (
                    <Ionicons
                      color={
                        selectedReadingIds.has(reading.reading.id)
                          ? colors.accent
                          : colors.textMuted
                      }
                      name={
                        selectedReadingIds.has(reading.reading.id) ? 'checkbox' : 'square-outline'
                      }
                      size={22}
                    />
                  ) : null}
                  <Text variant="muted">
                    {reading.reading.status === 'draft' ? '草稿' : '已保存'}
                  </Text>
                  {!isBatchSelecting ? (
                    <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                  ) : null}
                </View>
              </View>
              <Text>{reading.question_text}</Text>
              <Text variant="muted">{readingCardLabel(reading)}</Text>
            </Pressable>
          ))
        ) : (
          <Text variant="muted">还没有记录。</Text>
        )}
      </View>

      {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  batchPanel: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadii.md,
    gap: spacing.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.danger,
  },
  historyLink: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  historyLinkLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  pinnedLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  recordHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  recordAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  recommendationPanel: {
    gap: spacing.xs,
  },
  recommendationTab: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recommendationTabAdded: {
    opacity: 0.55,
  },
  recommendationTabSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  recommendationTabTextSelected: {
    color: colors.surface,
    fontWeight: '700',
  },
  rowCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  rowCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  section: {
    gap: spacing.md,
  },
  tagChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadii.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  tagDeleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    position: 'absolute',
    right: 0,
    top: -4,
  },
  tagPanel: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statRow: {
    alignItems: 'baseline',
    borderBottomColor: colors.border,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  statValue: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  titleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topicCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.sm,
  },
  topicHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  topicIconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadii.md,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
});
