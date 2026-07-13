import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  buildReadingShareText,
  deleteReadingAfterConfirmation,
} from '@/features/readings/readingDetailActions';
import { readingRepository } from '@/repositories/repositoryFactory';
import { IconButton } from '@/features/topics/components/IconButton';
import { orientationLabel } from '@/features/topics/topicPresentation';
import { useReadingDetail } from '@/features/readings/useReadings';
import { useReadingFollowUps } from '@/features/followups/useFollowUps';
import { formatFollowUpDate } from '@/features/followups/followUpDate';
import { outcomeLabels } from '@/features/followups/followUpPresentation';
import { borderRadii, colors, spacing } from '@/theme/tokens';
import { spreadRepository } from '@/features/spreads/spreadRepository';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatReadingDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ReadingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ readingId?: string | string[] }>();
  const readingId = firstRouteParam(params.readingId);
  const {
    data: detail,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useReadingDetail(readingId);
  const { items: followUps } = useReadingFollowUps(readingId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const deleteReading = async () => {
    if (!detail) {
      return;
    }

    setActionError(null);
    setIsActing(true);

    try {
      await deleteReadingAfterConfirmation(readingRepository, detail.reading.id, true);
      router.replace({ pathname: '/topics/[topicId]', params: { topicId: detail.topic.id } });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '暂时无法删除这条记录。');
    } finally {
      setIsActing(false);
    }
  };

  const confirmDelete = () => {
    if (!detail) {
      return;
    }

    Alert.alert(
      '删除这条记录？',
      `将永久删除这条记录、${detail.cards.length} 张牌面及 ${followUps.length} 条关联回顾。此操作无法恢复。`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除记录', style: 'destructive', onPress: () => void deleteReading() },
      ],
    );
  };

  const toggleFavorite = async () => {
    if (!detail || isActing) {
      return;
    }

    setActionError(null);
    setIsActing(true);

    try {
      await readingRepository.toggleFavorite(detail.reading.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '暂时无法更新收藏状态。');
    } finally {
      setIsActing(false);
    }
  };

  const shareReading = async () => {
    if (!detail || isActing) {
      return;
    }

    setActionError(null);

    try {
      await Share.share({ message: buildReadingShareText(detail) });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '暂时无法分享这条记录。');
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Text variant="muted">正在加载记录…</Text>
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
        <Text variant="subtitle">找不到这条记录</Text>
        <Text variant="muted">它可能已经被删除，或不再属于当前用户。</Text>
        <Button label="返回议题列表" onPress={() => router.replace('/topics')} />
      </Screen>
    );
  }

  const templateSource = detail.question_template
    ? `固定问题：${detail.question_template.question_text}`
    : '临时问题';
  const spread = detail.reading.spread_id
    ? spreadRepository.resolveSpread(
        detail.reading.spread_id,
        detail.reading.spread_id === 'open' ? detail.cards.length : undefined,
      )
    : null;
  const originalDrawSessionId = detail.cards.find(
    ({ reading_card: card }) => card.source === 'drawn' && card.drawSessionId !== null,
  )?.reading_card.drawSessionId;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <IconButton accessibilityLabel="返回" icon="arrow-back" onPress={() => router.back()} />
        <View style={styles.topActions}>
          <IconButton
            accessibilityLabel={detail.reading.is_favorite ? '取消收藏记录' : '收藏记录'}
            icon={detail.reading.is_favorite ? 'star' : 'star-outline'}
            onPress={() => void toggleFavorite()}
          />
          <IconButton
            accessibilityLabel="编辑记录"
            icon="pencil-outline"
            onPress={() =>
              router.push({ pathname: '/readings/edit', params: { readingId: detail.reading.id } })
            }
          />
          <IconButton
            accessibilityLabel="删除记录"
            icon="trash-outline"
            onPress={confirmDelete}
            tone="danger"
          />
        </View>
      </View>

      <View style={styles.context}>
        <View style={styles.titleRow}>
          <Text variant="eyebrow">{detail.topic.title}</Text>
          <Text style={styles.statusLabel}>
            {detail.reading.status === 'draft' ? '草稿' : '正式记录'}
          </Text>
          {detail.reading.is_favorite ? <Text style={styles.favoriteLabel}>已收藏</Text> : null}
        </View>
        <Text variant="title">{detail.question_text}</Text>
        <Text variant="muted">{templateSource}</Text>
        <Text variant="muted">
          {formatReadingDateTime(detail.reading.reading_at, detail.reading.reading_timezone)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="复制问题新建记录"
          onPress={() =>
            router.push({
              pathname: '/readings/new',
              params: { questionText: detail.question_text, topicId: detail.topic.id },
            })
          }
        />
        {detail.question_template ? (
          <Button
            label="查看同题历史"
            onPress={() =>
              router.push({
                pathname: '/questions/history',
                params: {
                  currentReadingId: detail.reading.id,
                  questionTemplateId: detail.question_template!.id,
                  topicId: detail.topic.id,
                },
              })
            }
          />
        ) : null}
        <Button label="分享纯文本摘要" onPress={() => void shareReading()} />
        <Button
          label="安排回顾"
          onPress={() =>
            router.push({ pathname: '/followups/new', params: { readingId: detail.reading.id } })
          }
        />
        {originalDrawSessionId ? (
          <Button
            label="查看原始抽牌"
            onPress={() =>
              router.push(`/draw/${originalDrawSessionId}` as never)
            }
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">牌面</Text>
        {detail.cards.length > 0 ? (
          detail.cards.map(({ reading_card: readingCard, tarot_card: tarotCard }) => {
            const spreadPosition = spread?.positions.find(
              (position) => position.id === readingCard.spreadPositionId,
            );
            return (
              <View key={readingCard.id} style={styles.cardRow}>
                <Text variant="subtitle">
                  {spreadPosition?.title ??
                    readingCard.position_name ??
                    `第 ${readingCard.position_order} 张牌`}
                </Text>
                {spreadPosition?.description ? (
                  <Text variant="muted">{spreadPosition.description}</Text>
                ) : null}
                <Text>{tarotCard?.name_zh ?? '尚未选择牌面'}</Text>
                <Text variant="muted">{orientationLabel(readingCard.orientation)}</Text>
                {readingCard.orientation === 'reversed' && readingCard.reversalExpression ? (
                  <Text variant="muted">
                    {readingCard.reversalExpression === 'underexpressed'
                      ? '逆位 · 表达不足'
                      : '逆位 · 表达过度'}
                  </Text>
                ) : null}
                <Text variant="muted">
                  来源：{readingCard.source === 'drawn' ? 'App 抽取' : '手动添加'}
                </Text>
                <Text variant="muted">牌阵位置：{readingCard.position_name ?? '未填写'}</Text>
              </View>
            );
          })
        ) : (
          <Text variant="muted">这个草稿还没有牌面。</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">个人解读</Text>
        <Text variant={detail.reading.interpretation ? 'body' : 'muted'}>
          {detail.reading.interpretation ?? '尚未填写'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">后续反馈</Text>
        <Text variant={detail.reading.reality_feedback ? 'body' : 'muted'}>
          {detail.reading.reality_feedback ?? '暂未记录后续反馈。'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">后来发生了什么</Text>
        {followUps.length === 0 ? (
          <Text variant="muted">尚未安排回顾。</Text>
        ) : (
          followUps.map((followUp) => (
            <View key={followUp.id} style={styles.cardRow}>
              <Text>
                计划：{formatFollowUpDate(followUp.scheduledFor, detail.reading.reading_timezone)}
              </Text>
              <Text>{followUp.outcome ? outcomeLabels[followUp.outcome] : '待回顾'}</Text>
              <Button
                label="查看回顾"
                onPress={() =>
                  router.push({
                    pathname: '/followups/[followUpId]',
                    params: { followUpId: followUp.id },
                  })
                }
              />
            </View>
          ))
        )}
      </View>

      <View style={styles.metadata}>
        <Text variant="muted">
          创建于 {formatReadingDateTime(detail.reading.created_at, detail.reading.reading_timezone)}
        </Text>
        <Text variant="muted">
          更新于 {formatReadingDateTime(detail.reading.updated_at, detail.reading.reading_timezone)}
        </Text>
      </View>

      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  context: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  favoriteLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  metadata: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  statusLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
