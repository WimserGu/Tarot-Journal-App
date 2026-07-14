import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StatBar } from '@/features/statistics/components/StatBar';
import { ReadingTraceLinks } from '@/features/statistics/components/ReadingTraceLinks';
import { readingDetailRoute } from '@/features/statistics/statisticsPageModel';
import { calculateStatistics } from '@/features/statistics/statisticsService';
import {
  defaultStatisticsFilter,
  type StatisticsFilter,
} from '@/features/statistics/statisticsTypes';
import { useStatisticsData } from '@/features/statistics/useStatistics';
import { borderRadii, colors, spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const router = useRouter();
  const { readings, topics, loading, error } = useStatisticsData();
  const [filter, setFilter] = useState<StatisticsFilter>(defaultStatisticsFilter);
  const [now] = useState(() => Date.now());
  const result = useMemo(() => calculateStatistics(readings, filter, now), [readings, filter, now]);
  const open = (id: string) => router.push(readingDetailRoute(id));
  const first = (ids: string[]) => (ids[0] ? () => open(ids[0]!) : undefined);
  return (
    <Screen scroll>
      <Text variant="eyebrow">Traceable Insights</Text>
      <Text variant="title">Statistics</Text>
      <Text variant="muted">仅描述历史记录；每项结果都可追溯到 Reading。</Text>
      <View style={styles.section}>
        <Text variant="subtitle">筛选</Text>
        <View style={styles.wrap}>
          <FilterButton
            label="全部 Topic"
            active={!filter.topicId}
            onPress={() => setFilter({ ...filter, topicId: undefined })}
          />
          {topics.map(({ topic }) => (
            <FilterButton
              key={topic.id}
              label={topic.title}
              active={filter.topicId === topic.id}
              onPress={() => setFilter({ ...filter, topicId: topic.id })}
            />
          ))}
        </View>
        <TextInput
          accessibilityLabel="开始日期"
          placeholder="开始日期 YYYY-MM-DD"
          value={filter.dateFrom ?? ''}
          onChangeText={(dateFrom) => setFilter({ ...filter, dateFrom: dateFrom || undefined })}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="结束日期"
          placeholder="结束日期 YYYY-MM-DD"
          value={filter.dateTo ?? ''}
          onChangeText={(dateTo) => setFilter({ ...filter, dateTo: dateTo || undefined })}
          style={styles.input}
        />
        <FilterButton
          label={`包含草稿：${filter.includeDrafts ? '是' : '否'}`}
          active={filter.includeDrafts}
          onPress={() => setFilter({ ...filter, includeDrafts: !filter.includeDrafts })}
        />
        {result.filterError ? (
          <Text accessibilityLiveRegion="polite">日期范围无效，请确认开始日期不晚于结束日期。</Text>
        ) : null}
      </View>
      {loading ? <Text accessibilityRole="progressbar">正在加载统计…</Text> : null}
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      {!loading && !error && result.readingCount.count === 0 ? (
        <View style={styles.card}>
          <Text variant="subtitle">暂无可统计记录</Text>
          <Text variant="muted">调整 Topic、日期或草稿筛选后再试。</Text>
        </View>
      ) : null}
      {result.readingCount.count > 0 ? (
        <>
          <View style={styles.grid}>
            <Metric
              label="Readings"
              value={result.readingCount.count}
              onPress={first(result.readingCount.readingIds)}
            />
            <Metric
              label="Cards"
              value={result.cardCount.count}
              onPress={first(result.cardCount.readingIds)}
            />
            <Metric
              label="最近 7 天"
              value={result.recent7Days.count}
              onPress={first(result.recent7Days.readingIds)}
            />
            <Metric
              label="最近 30 天"
              value={result.recent30Days.count}
              onPress={first(result.recent30Days.readingIds)}
            />
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">正逆位分布</Text>
            <StatBar
              label="正位"
              count={result.orientationDistribution.upright.count}
              ratio={result.orientationDistribution.upright.ratio}
              onPress={first(result.orientationDistribution.upright.readingIds)}
            />
            <StatBar
              label="逆位"
              count={result.orientationDistribution.reversed.count}
              ratio={result.orientationDistribution.reversed.ratio}
              onPress={first(result.orientationDistribution.reversed.readingIds)}
            />
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">双逆位细分</Text>
            <Text variant="muted">只统计明确记录了左右旋的逆位牌，不包含普通逆位。</Text>
            <StatBar
              label="逆位・左旋"
              count={result.dualReversalDistribution.left.count}
              ratio={result.dualReversalDistribution.left.ratio}
              onPress={first(result.dualReversalDistribution.left.readingIds)}
            />
            <StatBar
              label="逆位・右旋"
              count={result.dualReversalDistribution.right.count}
              ratio={result.dualReversalDistribution.right.ratio}
              onPress={first(result.dualReversalDistribution.right.readingIds)}
            />
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">大 / 小阿卡那</Text>
            <StatBar
              label="大阿卡那"
              count={result.majorArcanaRatio.count}
              ratio={result.majorArcanaRatio.ratio}
              onPress={first(result.majorArcanaRatio.readingIds)}
            />
            <StatBar
              label="小阿卡那"
              count={result.minorArcanaRatio.count}
              ratio={result.minorArcanaRatio.ratio}
              onPress={first(result.minorArcanaRatio.readingIds)}
            />
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">花色分布</Text>
            {(
              [
                ['wands', '权杖'],
                ['cups', '圣杯'],
                ['swords', '宝剑'],
                ['pentacles', '星币'],
              ] as const
            ).map(([key, label]) => (
              <StatBar
                key={key}
                label={label}
                count={result.suitDistribution[key].count}
                ratio={result.suitDistribution[key].ratio}
                onPress={first(result.suitDistribution[key].readingIds)}
              />
            ))}
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">Top Cards</Text>
            {result.topCards.map((card) => (
              <View key={card.tarotCard.id} style={styles.item}>
                <Pressable accessibilityRole="button" onPress={first(card.readingIds)}>
                  <Text>
                    {card.tarotCard.name_en} / {card.tarotCard.name_zh}
                  </Text>
                  <Text variant="muted">
                    {card.totalCount} 次 · 正位 {card.uprightCount} · 逆位 {card.reversedCount}
                  </Text>
                </Pressable>
                <ReadingTraceLinks readingIds={card.readingIds} onOpen={open} />
              </View>
            ))}
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">固定问题次数</Text>
            {result.questionStatistics.map((question) => (
              <View
                key={`${question.questionTemplateId}:${question.questionText}`}
                style={styles.item}
              >
                <Text>{question.questionText}</Text>
                <Text>{question.readingCount} 次</Text>
                <ReadingTraceLinks readingIds={question.readingIds} onOpen={open} />
              </View>
            ))}
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">连续出现</Text>
            {result.streaks.length === 0 ? (
              <Text variant="muted">当前范围没有连续多次出现的牌。</Text>
            ) : (
              result.streaks.map((streak) => (
                <View key={streak.tarotCard.id} style={styles.item}>
                  <Text>
                    {streak.tarotCard.name_en} · 连续 {streak.consecutiveReadings} 次 Reading
                  </Text>
                  <ReadingTraceLinks readingIds={streak.readingIds} onOpen={open} />
                </View>
              ))
            )}
          </View>
          {result.comparison ? (
            <View style={styles.card}>
              <Text variant="subtitle">与上一同长度周期比较</Text>
              <Comparison label="Readings" value={result.comparison.readingChangePercent} />
              <Comparison label="Cards" value={result.comparison.cardChangePercent} />
              <ReadingTraceLinks
                readingIds={result.comparison.current.readings.readingIds}
                onOpen={open}
              />
            </View>
          ) : null}
          <View style={styles.card}>
            <Text variant="subtitle">数据来源</Text>
            <Text>{result.trace.readingCount} Readings</Text>
            <Text>{result.trace.cardCount} Cards</Text>
            <ReadingTraceLinks readingIds={result.trace.readingIds} onOpen={open} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.filter, active ? styles.active : null]}
    >
      <Text style={active ? styles.activeText : null}>{label}</Text>
    </Pressable>
  );
}
function Metric({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={styles.metric}
    >
      <Text variant="subtitle">{value}</Text>
      <Text variant="muted">{label}</Text>
    </Pressable>
  );
}
function Comparison({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.row}>
      <Text>{label}</Text>
      <Text>{value === null ? '无可比基期' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filter: {
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  active: { backgroundColor: colors.text },
  activeText: { color: colors.surface },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadii.md,
    gap: spacing.md,
    padding: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    backgroundColor: colors.surface,
    borderRadius: borderRadii.md,
    minWidth: '45%',
    padding: spacing.md,
  },
  item: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
