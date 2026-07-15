import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';

import {
  EmptyMysticState,
  GlassPanel,
  MoonButton,
  MysticHeader,
  MysticScreen,
  MysticText,
  SectionLabel,
} from '@/components/mystic';
import { TarotCardDisplay } from '@/features/draw/components/TarotCardDisplay';
import { formatFollowUpDate } from '@/features/followups/followUpDate';
import { outcomeLabels } from '@/features/followups/followUpPresentation';
import { useReadingFollowUps } from '@/features/followups/useFollowUps';
import {
  buildReadingShareText,
  deleteReadingAfterConfirmation,
} from '@/features/readings/readingDetailActions';
import { useReadingDetail } from '@/features/readings/useReadings';
import { spreadRepository } from '@/features/spreads/spreadRepository';
import { readingRepository } from '@/repositories/repositoryFactory';
import { useAppTheme } from '@/theme/useAppTheme';

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
  const { theme } = useAppTheme();
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
    if (!detail) return;
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
    if (!detail) return;
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
    if (!detail || isActing) return;
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
    if (!detail || isActing) return;
    setActionError(null);
    try {
      await Share.share({ message: buildReadingShareText(detail) });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '暂时无法分享这条记录。');
    }
  };

  if (isLoading) {
    return (
      <MysticScreen>
        <EmptyMysticState description="正在整理问题、牌面与记录内容。" title="正在加载 Reading…" />
      </MysticScreen>
    );
  }

  if (errorMessage) {
    return (
      <MysticScreen>
        <MysticHeader onBack={() => router.back()} title="无法打开 Reading" />
        <EmptyMysticState
          actionLabel="重新加载"
          description={errorMessage}
          onAction={() => void reload()}
          title="暂时无法读取记录"
        />
      </MysticScreen>
    );
  }

  if (!detail) {
    return (
      <MysticScreen>
        <MysticHeader onBack={() => router.back()} title="Reading 不存在" />
        <EmptyMysticState
          actionLabel="返回议题列表"
          description="它可能已经被删除，或不再属于当前用户。"
          onAction={() => router.replace('/topics')}
          title="找不到这条记录"
        />
      </MysticScreen>
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
    <MysticScreen maxWidth={980} scroll>
      <MysticHeader
        action={
          <MoonButton
            accessibilityLabel={detail.reading.is_favorite ? '取消收藏记录' : '收藏记录'}
            label={detail.reading.is_favorite ? '★ 已收藏' : '☆ 收藏'}
            loading={isActing}
            onPress={() => void toggleFavorite()}
            variant="ghost"
          />
        }
        onBack={() => router.back()}
        subtitle={formatReadingDateTime(detail.reading.reading_at, detail.reading.reading_timezone)}
        title="Tarot Journal"
      />

      <GlassPanel variant="elevated">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <MysticText style={{ color: theme.colors.primarySoft }} variant="caption">
            {detail.topic.title}
          </MysticText>
          <MysticText
            style={{
              color:
                detail.reading.status === 'draft' ? theme.status.draft : theme.status.completed,
              fontWeight: '700',
            }}
            variant="caption"
          >
            {detail.reading.status === 'draft' ? '草稿' : '正式记录'}
          </MysticText>
          {detail.question_tag ? (
            <MysticText style={{ color: theme.colors.warm }} variant="caption">
              #{detail.question_tag.name}
            </MysticText>
          ) : null}
        </View>
        <MysticText variant="display">{detail.question_text}</MysticText>
        <MysticText variant="caption">{templateSource}</MysticText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <MoonButton
            label="复制问题再抽一次"
            onPress={() =>
              router.push({
                pathname: '/readings/new',
                params: {
                  questionText: detail.question_text,
                  questionTagId: detail.question_tag?.id,
                  topicId: detail.topic.id,
                },
              })
            }
            variant="secondary"
          />
          {detail.question_template ? (
            <MoonButton
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
              variant="ghost"
            />
          ) : null}
        </View>
      </GlassPanel>

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel description={spread ? spread.name : '这次记录没有指定牌阵。'} title="牌面" />
        {detail.cards.length > 0 ? (
          <View
            style={{
              alignItems: 'stretch',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.md,
              justifyContent: 'center',
            }}
          >
            {detail.cards.map(({ reading_card: readingCard, tarot_card: tarotCard }) => {
              const spreadPosition = spread?.positions.find(
                (position) => position.id === readingCard.spreadPositionId,
              );
              return (
                <GlassPanel
                  key={readingCard.id}
                  style={{ flexBasis: 250, flexGrow: 1, maxWidth: 340 }}
                  variant="subtle"
                >
                  {readingCard.tarot_card_id !== null ? (
                    <TarotCardDisplay
                      cardId={readingCard.tarot_card_id}
                      name={tarotCard?.name_zh ?? '未知牌面'}
                      orientation={readingCard.orientation}
                      reversalVariant={readingCard.reversalVariant}
                      size="standard"
                    />
                  ) : (
                    <EmptyMysticState description="这张牌的牌面尚未选择。" title="暂无牌面" />
                  )}
                  <View style={{ gap: theme.spacing.xs }}>
                    <MysticText style={{ color: theme.colors.warm }} variant="caption">
                      {spreadPosition?.title ??
                        readingCard.position_name ??
                        `第 ${readingCard.position_order} 张牌`}
                    </MysticText>
                    {spreadPosition?.description ? (
                      <MysticText variant="caption">{spreadPosition.description}</MysticText>
                    ) : null}
                    <MysticText variant="caption">
                      {readingCard.source === 'drawn' ? 'App 抽取' : '手动添加'}
                    </MysticText>
                  </View>
                  <View
                    style={{
                      borderTopColor: theme.colors.divider,
                      borderTopWidth: 1,
                      gap: theme.spacing.xs,
                      paddingTop: theme.spacing.md,
                    }}
                  >
                    <MysticText style={{ color: theme.colors.primarySoft }} variant="caption">
                      这张牌的解读
                    </MysticText>
                    <MysticText variant={readingCard.interpretation ? 'body' : 'muted'}>
                      {readingCard.interpretation ?? '尚未填写'}
                    </MysticText>
                  </View>
                </GlassPanel>
              );
            })}
          </View>
        ) : (
          <EmptyMysticState description="可以编辑草稿并加入牌面。" title="这个草稿还没有牌面" />
        )}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel description="你当时对整个牌阵的观察。" title="总体解读" />
        <GlassPanel variant="elevated">
          <MysticText variant={detail.reading.interpretation ? 'body' : 'muted'}>
            {detail.reading.interpretation ?? '尚未填写总体解读。'}
          </MysticText>
        </GlassPanel>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel description="把牌面放回真实生活中。" title="后续反馈" />
        <GlassPanel variant="subtle">
          <MysticText variant={detail.reading.reality_feedback ? 'body' : 'muted'}>
            {detail.reading.reality_feedback ?? '暂未记录后续反馈。'}
          </MysticText>
        </GlassPanel>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel title="后来发生了什么" />
        {followUps.length === 0 ? (
          <EmptyMysticState
            actionLabel="安排回顾"
            description="选择未来的日期，再回来对照当时的观察。"
            onAction={() =>
              router.push({ pathname: '/followups/new', params: { readingId: detail.reading.id } })
            }
            title="尚未安排回顾"
          />
        ) : (
          followUps.map((followUp) => (
            <GlassPanel key={followUp.id} variant="subtle">
              <MysticText variant="cardTitle">
                {followUp.outcome ? outcomeLabels[followUp.outcome] : '待回顾'}
              </MysticText>
              <MysticText variant="caption">
                计划：{formatFollowUpDate(followUp.scheduledFor, detail.reading.reading_timezone)}
              </MysticText>
              <MoonButton
                label="查看回顾"
                onPress={() =>
                  router.push({
                    pathname: '/followups/[followUpId]',
                    params: { followUpId: followUp.id },
                  })
                }
                variant="secondary"
              />
            </GlassPanel>
          ))
        )}
      </View>

      <GlassPanel variant="subtle">
        <SectionLabel description="这些操作不会改变原始抽牌记录。" title="记录操作" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <MoonButton
            label="编辑"
            onPress={() =>
              router.push({ pathname: '/readings/edit', params: { readingId: detail.reading.id } })
            }
            variant="secondary"
          />
          <MoonButton label="分享摘要" onPress={() => void shareReading()} variant="ghost" />
          <MoonButton
            label="安排回顾"
            onPress={() =>
              router.push({ pathname: '/followups/new', params: { readingId: detail.reading.id } })
            }
            variant="ghost"
          />
          {originalDrawSessionId ? (
            <MoonButton
              label="查看原始抽牌"
              onPress={() => router.push(`/draw/${originalDrawSessionId}` as never)}
              variant="ghost"
            />
          ) : null}
          <MoonButton label="删除记录" onPress={confirmDelete} variant="destructive" />
        </View>
        <View
          style={{
            borderTopColor: theme.colors.divider,
            borderTopWidth: 1,
            gap: 2,
            paddingTop: theme.spacing.md,
          }}
        >
          <MysticText variant="caption">
            创建于{' '}
            {formatReadingDateTime(detail.reading.created_at, detail.reading.reading_timezone)}
          </MysticText>
          <MysticText variant="caption">
            更新于{' '}
            {formatReadingDateTime(detail.reading.updated_at, detail.reading.reading_timezone)}
          </MysticText>
        </View>
      </GlassPanel>

      {actionError ? (
        <MysticText accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
          {actionError}
        </MysticText>
      ) : null}
    </MysticScreen>
  );
}
