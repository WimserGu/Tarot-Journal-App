import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { ReadingTimelineItem } from '@/features/readings/readingRepository';
import { useQuestionHistory } from '@/features/readings/useReadings';
import { IconButton } from '@/features/topics/components/IconButton';
import { reversalStateLabel } from '@/features/draw/reversalPresentation';
import { formatTopicDate, orientationLabel } from '@/features/topics/topicPresentation';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cardNames(cards: readonly { name_zh: string }[]): string {
  return cards.length > 0 ? cards.map((card) => card.name_zh).join('、') : '无';
}

export default function QuestionHistoryScreen() {
  const router = useRouter();
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.state}>
          <Text variant="subtitle">缺少固定问题标识</Text>
          <Button label="返回议题列表" onPress={() => router.replace('/topics')} />
        </View>
      </SafeAreaView>
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.state}>
          <Text variant="muted">正在加载同题历史…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (history.error_message) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.state}>
          <Text>{history.error_message}</Text>
          <Button label="重新加载" onPress={() => void history.reload()} />
        </View>
      </SafeAreaView>
    );
  }

  if (!history.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.state}>
          <Text variant="subtitle">找不到这个固定问题</Text>
          <Button label="返回议题详情" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const { comparison } = history.data;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={history.data.records}
        keyExtractor={(item) => item.reading.id}
        ListEmptyComponent={
          <View style={styles.state}>
            <Text variant="subtitle">这个固定问题还没有记录</Text>
            <Text variant="muted">保存记录后，这里会保留每次当时的问题快照和牌面。</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.topBar}>
              <IconButton
                accessibilityLabel="返回"
                icon="arrow-back"
                onPress={() => router.back()}
              />
              <Text variant="title">同题历史</Text>
              <View style={styles.topBarSpacer} />
            </View>
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  comparison: {
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
    padding: spacing.md,
  },
  completedLabel: { color: colors.accent, fontWeight: '700' },
  content: { flexGrow: 1, gap: spacing.sm, padding: spacing.lg },
  draftLabel: { color: colors.textMuted, fontWeight: '700' },
  headerContent: { gap: spacing.lg, paddingBottom: spacing.md },
  pressed: { opacity: 0.72 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  recordItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  state: { gap: spacing.md, padding: spacing.xl },
  summary: { gap: spacing.sm },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  topBarSpacer: { width: 44 },
});
