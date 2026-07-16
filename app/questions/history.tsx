import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  EmptyMysticState,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import type { ReadingTimelineItem } from '@/features/readings/readingRepository';
import { useQuestionHistory } from '@/features/readings/useReadings';
import { reversalStateLabel } from '@/features/draw/reversalPresentation';
import { formatTopicDate, orientationLabel } from '@/features/topics/topicPresentation';
import type { AppTheme } from '@/theme/types';
import { useAppTheme } from '@/theme/useAppTheme';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cardNames(cards: readonly { name_zh: string }[]): string {
  return cards.length > 0 ? cards.map((card) => card.name_zh).join('、') : '无';
}

export default function QuestionHistoryScreen() {
  const router = useRouter();
  const styles = useQuestionHistoryStyles();
  const params = useLocalSearchParams<{
    currentReadingId?: string | string[];
    questionTemplateId?: string | string[];
    topicId?: string | string[];
  }>();
  const topicId = firstRouteParam(params.topicId);
  const questionTemplateId = firstRouteParam(params.questionTemplateId);
  const currentReadingId = firstRouteParam(params.currentReadingId);
  const historyQuery = useMemo(
    () =>
      topicId && questionTemplateId
        ? {
            topic_id: topicId,
            question_template_id: questionTemplateId,
            current_reading_id: currentReadingId,
          }
        : null,
    [currentReadingId, questionTemplateId, topicId],
  );
  const history = useQuestionHistory(historyQuery);

  if (!topicId || !questionTemplateId) {
    return (
      <Screen maxWidth={900}>
        <View style={styles.state}>
          <Text variant="subtitle">缺少固定问题标识</Text>
          <Button label="返回议题列表" onPress={() => router.replace('/topics')} />
        </View>
      </Screen>
    );
  }

  const renderItem = ({ item }: { item: ReadingTimelineItem }) => (
    <Pressable
      accessibilityLabel={`查看 ${item.question_text} 的记录详情`}
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/readings/[readingId]', params: { readingId: item.reading.id } })
      }
      style={({ pressed }) => [styles.recordItem, pressed ? styles.pressed : null]}
    >
      <View style={styles.recordHeader}>
        <Text>{formatTopicDate(item.reading.reading_at, item.reading.reading_timezone)}</Text>
        <Text style={item.reading.status === 'draft' ? styles.draftLabel : styles.completedLabel}>
          {item.reading.status === 'draft' ? '草稿' : '正式记录'}
        </Text>
      </View>
      <Text>{item.question_text}</Text>
      <Text variant="muted">
        {item.cards.length > 0
          ? item.cards
              .map(
                (card) =>
                  `${card.tarot_card?.name_zh ?? '未选择牌面'} · ${reversalStateLabel(card.orientation, card.reversalVariant)}`,
              )
              .join(' / ')
          : '尚未录入牌面'}
      </Text>
    </Pressable>
  );

  if (history.is_loading) {
    return (
      <Screen maxWidth={900}>
        <View style={styles.state}>
          <Text variant="muted">正在加载同题历史…</Text>
        </View>
      </Screen>
    );
  }

  if (history.error_message) {
    return (
      <Screen maxWidth={900}>
        <View style={styles.state}>
          <Text>{history.error_message}</Text>
          <Button label="重新加载" onPress={() => void history.reload()} />
        </View>
      </Screen>
    );
  }

  if (!history.data) {
    return (
      <Screen maxWidth={900}>
        <View style={styles.state}>
          <Text variant="subtitle">找不到这个固定问题</Text>
          <Button label="返回议题详情" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const { comparison } = history.data;

  return (
    <Screen maxWidth={1040}>
      <FlatList
        contentContainerStyle={styles.content}
        data={history.data.records}
        keyExtractor={(item) => item.reading.id}
        ListEmptyComponent={
          <EmptyMysticState
            description="保存记录后，这里会保留每次当时的问题快照和牌面。"
            title="这个固定问题还没有记录"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <MysticHeader
              eyebrow="Question history"
              onBack={() => router.back()}
              subtitle="比较同一个固定问题在不同时间留下的牌面与方向。"
              title="同题历史"
            />
            <View style={styles.summary}>
              <Text variant="subtitle">{history.data.question_template.question_text}</Text>
              <Text>累计记录 {history.data.total_reading_count} 次</Text>
              <Text variant="muted">
                最早：
                {history.data.earliest_reading_at
                  ? formatTopicDate(history.data.earliest_reading_at, 'Africa/Nairobi')
                  : '暂无'}
                {' · '}最近：
                {history.data.latest_reading_at
                  ? formatTopicDate(history.data.latest_reading_at, 'Africa/Nairobi')
                  : '暂无'}
              </Text>
              <Text variant="muted">
                最常出现的牌：
                {cardNames(history.data.most_frequent_cards.map((card) => card.tarot_card))}
              </Text>
            </View>
            <View style={styles.comparison}>
              <Text variant="subtitle">与上一条记录对比</Text>
              {comparison ? (
                <>
                  <Text variant="muted">比较当前记录与它之前最近的一条同题记录。</Text>
                  <Text>重复牌：{cardNames(comparison.repeated_cards)}</Text>
                  <Text>新出现：{cardNames(comparison.new_cards)}</Text>
                  <Text>上次有、本次未出现：{cardNames(comparison.disappeared_cards)}</Text>
                  <Text>
                    方向变化：
                    {comparison.orientation_changes.length > 0
                      ? comparison.orientation_changes
                          .map(
                            (change) =>
                              `${change.tarot_card.name_zh} ${orientationLabel(change.previous_orientation)}→${orientationLabel(change.current_orientation)}`,
                          )
                          .join('；')
                      : '无'}
                  </Text>
                </>
              ) : (
                <Text variant="muted">记录不足，暂不形成趋势。</Text>
              )}
            </View>
            {history.data.records.length > 0 ? <Text variant="subtitle">历史记录</Text> : null}
          </View>
        }
        renderItem={renderItem}
        style={styles.list}
      />
    </Screen>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    comparison: {
      backgroundColor: theme.colors.glassElevated,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: theme.borders.hairline,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    completedLabel: { color: theme.colors.success, fontWeight: '700' },
    content: { flexGrow: 1, gap: theme.spacing.sm },
    draftLabel: { color: theme.colors.textMuted, fontWeight: '700' },
    headerContent: { gap: theme.spacing.lg, paddingBottom: theme.spacing.md },
    list: { flex: 1 },
    pressed: { opacity: theme.opacity.pressed },
    recordHeader: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' },
    recordItem: {
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: theme.borders.hairline,
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
    },
    state: { gap: theme.spacing.md, padding: theme.spacing.xl },
    summary: {
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: theme.borders.hairline,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
  });
}

function useQuestionHistoryStyles() {
  const { theme } = useAppTheme();
  return createStyles(theme);
}
