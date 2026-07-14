import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { reversalStateLabel } from '@/features/draw/reversalPresentation';
import { TopicIcon } from '@/features/topics/components/TopicIcon';
import { questionFrequencyLabels } from '@/features/topics/topicConstants';
import { topicRepository } from '@/repositories/repositoryFactory';
import { formatTopicDate, getCurrentTimeZone } from '@/features/topics/topicPresentation';
import type { TopicDeletionSummary, TopicRecentReading } from '@/features/topics/topicRepository';
import { useTopicDetail } from '@/features/topics/useTopics';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function deletionMessage(summary: TopicDeletionSummary): string {
  return `将永久删除“${summary.topic_title}”、${summary.question_count} 个固定问题、${summary.reading_count} 条记录和 ${summary.reading_card_count} 张已录入牌面。此操作无法恢复。`;
}

function readingCardLabel(reading: TopicRecentReading): string {
  if (reading.cards.length === 0) {
    return '尚未选择牌面';
  }

  return reading.cards
    .map((card) => {
      const position = card.position_name ? `${card.position_name}：` : '';
      return `${position}${card.tarot_card.name_zh} · ${reversalStateLabel(card.orientation, card.reversalVariant)}`;
    })
    .join(' / ');
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
  const timeZone = getCurrentTimeZone();

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
        <Text variant="subtitle">最近记录</Text>
        {detail.recent_readings.length > 0 ? (
          detail.recent_readings.map((reading) => (
            <View key={reading.reading.id} style={styles.rowCard}>
              <View style={styles.recordHeader}>
                <Text>{formatTopicDate(reading.reading.reading_at, timeZone)}</Text>
                <Text variant="muted">
                  {reading.reading.status === 'draft' ? '草稿' : '已保存'}
                </Text>
              </View>
              <Text>{reading.question_text}</Text>
              <Text variant="muted">{readingCardLabel(reading)}</Text>
            </View>
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
  rowCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  section: {
    gap: spacing.md,
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
