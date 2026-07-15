import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StatBar } from '@/features/statistics/components/StatBar';
import { ReadingTraceLinks } from '@/features/statistics/components/ReadingTraceLinks';
import { readingDetailRoute } from '@/features/statistics/statisticsPageModel';
import { calculateStatistics } from '@/features/statistics/statisticsService';
import { reversalStateLabel } from '@/features/draw/reversalPresentation';
import {
  applyInsightsDatePreset,
  filterInsightCardChoices,
  insightsFilterSummary,
  INSIGHTS_VIEWS,
  type InsightsDatePreset,
  type InsightsView,
} from '@/features/statistics/insightsFilterModel';
import {
  defaultStatisticsFilter,
  type StatisticsFilter,
} from '@/features/statistics/statisticsTypes';
import { useStatisticsData } from '@/features/statistics/useStatistics';
import { borderRadii, colors, spacing } from '@/theme/tokens';

type CardDirectionFilter = 'all' | 'upright' | 'reversed' | 'left' | 'right';

function matchesCardDirection(
  orientation: 'upright' | 'reversed',
  reversalVariant: 'left' | 'right' | null,
  filter: CardDirectionFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'upright') return orientation === 'upright';
  if (filter === 'left' || filter === 'right') return reversalVariant === filter;
  return orientation === 'reversed' && reversalVariant === null;
}

function formatOccurrenceDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

export default function InsightsScreen() {
  const router = useRouter();
  const { readings, topics, loading, error } = useStatisticsData();
  const [filter, setFilter] = useState<StatisticsFilter>(defaultStatisticsFilter);
  const [activeView, setActiveView] = useState<InsightsView>('overview');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [datePreset, setDatePreset] = useState<InsightsDatePreset>('all');
  const [showAllStreaks, setShowAllStreaks] = useState(false);
  const [cardQuery, setCardQuery] = useState('');
  const [showCardResults, setShowCardResults] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cardDirection, setCardDirection] = useState<CardDirectionFilter>('all');
  const [interpretedOnly, setInterpretedOnly] = useState(false);
  const [showAllInterpretations, setShowAllInterpretations] = useState(false);
  const [now] = useState(() => Date.now());
  const result = useMemo(() => calculateStatistics(readings, filter, now), [readings, filter, now]);
  const questionTagOptions = useMemo(
    () =>
      calculateStatistics(readings, { ...filter, questionTagId: undefined }, now)
        .questionTagStatistics,
    [filter, now, readings],
  );
  const cardChoices = useMemo(() => {
    return filterInsightCardChoices(result.cardStatistics, cardQuery);
  }, [cardQuery, result.cardStatistics]);
  const selectedCard = result.cardStatistics.find((card) => card.tarotCard.id === selectedCardId);
  const selectedOccurrences = (selectedCard?.occurrences ?? []).filter(
    (occurrence) =>
      matchesCardDirection(occurrence.orientation, occurrence.reversalVariant, cardDirection) &&
      (!interpretedOnly || occurrence.interpretation !== null),
  );
  const visibleOccurrences = showAllInterpretations
    ? selectedOccurrences
    : selectedOccurrences.slice(0, 5);
  const selectedTopicTitle = topics.find(({ topic }) => topic.id === filter.topicId)?.topic.title;
  const selectedQuestionTagLabel = questionTagOptions.find(
    (tag) => tag.questionTagId === filter.questionTagId,
  )?.label;
  const filterSummary = insightsFilterSummary(filter, selectedTopicTitle, selectedQuestionTagLabel);
  const open = (id: string) => router.push(readingDetailRoute(id));
  const first = (ids: string[]) => (ids[0] ? () => open(ids[0]!) : undefined);
  const selectDatePreset = (preset: InsightsDatePreset) => {
    setDatePreset(preset);
    setFilter((current) => applyInsightsDatePreset(current, preset, new Date(now)));
  };
  const selectCard = (cardId: number) => {
    const card = result.cardStatistics.find((item) => item.tarotCard.id === cardId);
    setSelectedCardId(cardId);
    setCardQuery(card?.tarotCard.name_zh ?? '');
    setShowCardResults(false);
    setCardDirection('all');
    setInterpretedOnly(false);
    setShowAllInterpretations(false);
  };
  return (
    <Screen scroll>
      <Text variant="eyebrow">Traceable Insights</Text>
      <Text variant="title">Insights</Text>
      <Text variant="muted">只描述历史记录；所有结论都可追溯到原始 Reading。</Text>
      <Pressable
        accessibilityLabel={filtersExpanded ? '收起 Insights 筛选' : '修改 Insights 筛选'}
        accessibilityRole="button"
        accessibilityState={{ expanded: filtersExpanded }}
        onPress={() => setFiltersExpanded((current) => !current)}
        style={({ pressed }) => [styles.filterSummary, pressed ? styles.pressed : null]}
      >
        <View style={styles.filterSummaryCopy}>
          <Text variant="muted">当前筛选</Text>
          <Text>{filterSummary}</Text>
        </View>
        <View style={styles.inlineAction}>
          <Text style={styles.actionText}>{filtersExpanded ? '收起' : '修改筛选'}</Text>
          <Ionicons
            color={colors.accent}
            name={filtersExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
          />
        </View>
      </Pressable>
      {filtersExpanded ? (
        <View style={styles.card}>
          <Text variant="subtitle">全局筛选</Text>
          <Text variant="muted">筛选会同时应用到概览、单牌和趋势。</Text>
          <Text>Topic</Text>
          <View style={styles.wrap}>
            <FilterButton
              active={!filter.topicId}
              label="全部 Topic"
              onPress={() => {
                setFilter((current) => ({
                  ...current,
                  topicId: undefined,
                  questionTagId: undefined,
                }));
              }}
            />
            {topics.map(({ topic }) => (
              <FilterButton
                active={filter.topicId === topic.id}
                key={topic.id}
                label={topic.title}
                onPress={() => {
                  setFilter((current) => ({
                    ...current,
                    topicId: topic.id,
                    questionTagId: undefined,
                  }));
                }}
              />
            ))}
          </View>
          <Text>问题标签</Text>
          {filter.topicId ? (
            <View style={styles.wrap}>
              <FilterButton
                active={filter.questionTagId === undefined}
                label="全部"
                onPress={() => {
                  setFilter((current) => ({ ...current, questionTagId: undefined }));
                }}
              />
              {questionTagOptions.map((tag) => (
                <FilterButton
                  active={filter.questionTagId === tag.questionTagId}
                  key={tag.questionTagId ?? 'unclassified'}
                  label={`${tag.label} · ${tag.readingCount}`}
                  onPress={() => {
                    setFilter((current) => ({ ...current, questionTagId: tag.questionTagId }));
                  }}
                />
              ))}
            </View>
          ) : (
            <Text variant="muted">选择 Topic 后可按该 Topic 的问题标签筛选。</Text>
          )}
          <Text>时间范围</Text>
          <View style={styles.wrap}>
            {(
              [
                ['all', '全部'],
                ['7days', '最近 7 天'],
                ['30days', '最近 30 天'],
                ['custom', '自定义'],
              ] as const
            ).map(([preset, label]) => (
              <FilterButton
                active={datePreset === preset}
                key={preset}
                label={label}
                onPress={() => selectDatePreset(preset)}
              />
            ))}
          </View>
          {datePreset === 'custom' ? (
            <View style={styles.dateInputs}>
              <TextInput
                accessibilityLabel="开始日期"
                onChangeText={(dateFrom) =>
                  setFilter((current) => ({ ...current, dateFrom: dateFrom || undefined }))
                }
                placeholder="开始日期 YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.dateInput]}
                value={filter.dateFrom ?? ''}
              />
              <TextInput
                accessibilityLabel="结束日期"
                onChangeText={(dateTo) =>
                  setFilter((current) => ({ ...current, dateTo: dateTo || undefined }))
                }
                placeholder="结束日期 YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.dateInput]}
                value={filter.dateTo ?? ''}
              />
            </View>
          ) : null}
          <View style={styles.wrap}>
            <FilterButton
              active={filter.includeDrafts}
              label={filter.includeDrafts ? '包含草稿' : '不含草稿'}
              onPress={() =>
                setFilter((current) => ({ ...current, includeDrafts: !current.includeDrafts }))
              }
            />
            <FilterButton
              active={false}
              label="重置筛选"
              onPress={() => {
                setFilter({ ...defaultStatisticsFilter });
                setDatePreset('all');
              }}
            />
          </View>
          {result.filterError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              日期范围无效，请确认开始日期不晚于结束日期。
            </Text>
          ) : null}
        </View>
      ) : null}
      <View accessibilityRole="tablist" style={styles.viewTabs}>
        {INSIGHTS_VIEWS.map((view) => (
          <ViewTab
            active={activeView === view.id}
            key={view.id}
            label={view.label}
            onPress={() => {
              setShowCardResults(false);
              setActiveView(view.id);
            }}
          />
        ))}
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
          {activeView === 'overview' ? (
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
                    count={result.suitDistribution[key].count}
                    key={key}
                    label={label}
                    onPress={first(result.suitDistribution[key].readingIds)}
                    ratio={result.suitDistribution[key].ratio}
                  />
                ))}
              </View>
            </>
          ) : null}
          {activeView === 'cards' ? (
            <View style={styles.card}>
              <Text variant="subtitle">单牌解读汇总</Text>
              <Text variant="muted">搜索一张牌，查看它的出现次数，以及每次记录的不同解读。</Text>
              <TextInput
                accessibilityLabel="搜索要汇总的塔罗牌"
                onChangeText={(value) => {
                  setCardQuery(value);
                  setSelectedCardId(null);
                  setShowCardResults(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowCardResults(false), 100);
                }}
                onFocus={() => setShowCardResults(true)}
                onSubmitEditing={() => {
                  if (cardChoices[0]) selectCard(cardChoices[0].tarotCard.id);
                }}
                placeholder="搜索中文或英文牌名"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={cardQuery}
              />
              {showCardResults ? (
                <View style={styles.searchResults}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    style={styles.searchResultsViewport}
                  >
                    {cardChoices.map((card) => (
                      <Pressable
                        accessibilityLabel={`选择${card.tarotCard.name_zh}，出现${card.totalCount}次`}
                        accessibilityRole="button"
                        key={card.tarotCard.id}
                        onPress={() => selectCard(card.tarotCard.id)}
                        style={({ pressed }) => [
                          styles.searchResult,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <View style={styles.searchResultCopy}>
                          <Text>{card.tarotCard.name_zh}</Text>
                          <Text variant="muted">{card.tarotCard.name_en}</Text>
                        </View>
                        <Text style={styles.countBadge}>{card.totalCount} 次</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  {cardChoices.length === 0 ? (
                    <Text variant="muted">当前范围内没有匹配的牌。</Text>
                  ) : null}
                </View>
              ) : null}
              {selectedCard ? (
                <View style={styles.cardInsight}>
                  <Text variant="subtitle">
                    {selectedCard.tarotCard.name_zh}：共出现 {selectedCard.totalCount} 次
                  </Text>
                  <Text variant="muted">
                    正位 {selectedCard.uprightCount} · 普通逆位 {selectedCard.ordinaryReversedCount}{' '}
                    · 左旋 {selectedCard.leftCount} · 右旋 {selectedCard.rightCount}
                  </Text>
                  <View style={styles.wrap}>
                    {(
                      [
                        ['all', '全部'],
                        ['upright', '正位'],
                        ['reversed', '普通逆位'],
                        ['left', '逆位・左旋'],
                        ['right', '逆位・右旋'],
                      ] as const
                    ).map(([value, label]) => (
                      <FilterButton
                        active={cardDirection === value}
                        key={value}
                        label={label}
                        onPress={() => {
                          setCardDirection(value);
                          setShowAllInterpretations(false);
                        }}
                      />
                    ))}
                  </View>
                  <FilterButton
                    active={interpretedOnly}
                    label="仅显示已填写解读"
                    onPress={() => {
                      setInterpretedOnly((current) => !current);
                      setShowAllInterpretations(false);
                    }}
                  />
                  <Text>{selectedOccurrences.length} 次符合当前方向</Text>
                  {visibleOccurrences.map((occurrence, index) => (
                    <View
                      key={`${occurrence.readingId}:${index}`}
                      style={styles.interpretationItem}
                    >
                      <Text variant="muted">
                        {formatOccurrenceDate(occurrence.readingAt, occurrence.readingTimezone)} ·{' '}
                        {reversalStateLabel(occurrence.orientation, occurrence.reversalVariant)}
                      </Text>
                      <Text>{occurrence.questionText}</Text>
                      <Text variant={occurrence.interpretation ? 'body' : 'muted'}>
                        {occurrence.interpretation ?? '这次没有填写单牌解读。'}
                      </Text>
                      <CompactOpenReading onOpen={() => open(occurrence.readingId)} />
                    </View>
                  ))}
                  {selectedOccurrences.length === 0 ? (
                    <Text variant="muted">这张牌还没有当前方向的记录。</Text>
                  ) : null}
                  {selectedOccurrences.length > 5 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setShowAllInterpretations((current) => !current)}
                      style={styles.textButton}
                    >
                      <Text style={styles.actionText}>
                        {showAllInterpretations
                          ? '收起解读记录'
                          : `查看全部 ${selectedOccurrences.length} 条`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text variant="muted">请选择一张牌。</Text>
              )}
            </View>
          ) : null}
          {activeView === 'trends' ? (
            <View style={styles.grid}>
              <Metric
                label="最近 7 天"
                onPress={first(result.recent7Days.readingIds)}
                value={result.recent7Days.count}
              />
              <Metric
                label="最近 30 天"
                onPress={first(result.recent30Days.readingIds)}
                value={result.recent30Days.count}
              />
            </View>
          ) : null}
          {activeView === 'trends' ? (
            <View style={styles.card}>
              <Text variant="subtitle">连续出现</Text>
              {result.streaks.length === 0 ? (
                <Text variant="muted">当前范围没有连续多次出现的牌。</Text>
              ) : (
                result.streaks.slice(0, showAllStreaks ? undefined : 3).map((streak) => (
                  <View key={streak.tarotCard.id} style={styles.item}>
                    <Text>
                      {streak.tarotCard.name_zh} · 连续 {streak.consecutiveReadings} 次
                    </Text>
                    <CollapsibleReadingLinks readingIds={streak.readingIds} onOpen={open} />
                  </View>
                ))
              )}
              {result.streaks.length > 3 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAllStreaks((current) => !current)}
                  style={styles.textButton}
                >
                  <Text style={styles.actionText}>
                    {showAllStreaks ? '收起连续记录' : '查看全部连续记录'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {activeView === 'trends' && result.comparison ? (
            <View style={styles.card}>
              <Text variant="subtitle">与上一同长度周期比较</Text>
              <Comparison label="Readings" value={result.comparison.readingChangePercent} />
              <Comparison label="Cards" value={result.comparison.cardChangePercent} />
              <CollapsibleReadingLinks
                readingIds={result.comparison.current.readings.readingIds}
                onOpen={open}
              />
            </View>
          ) : null}
          {activeView === 'trends' ? (
            <View style={styles.card}>
              <Text variant="subtitle">数据来源</Text>
              <Text>{result.trace.readingCount} Readings</Text>
              <Text>{result.trace.cardCount} Cards</Text>
              <CollapsibleReadingLinks readingIds={result.trace.readingIds} onOpen={open} />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
function ViewTab({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.viewTab, active ? styles.viewTabActive : null]}
    >
      <Text style={active ? styles.viewTabTextActive : undefined}>{label}</Text>
    </Pressable>
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
function CompactOpenReading({ onOpen }: { onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={styles.textButton}>
      <Text style={styles.actionText}>打开 Reading</Text>
    </Pressable>
  );
}
function CollapsibleReadingLinks({
  readingIds,
  onOpen,
}: {
  readingIds: string[];
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.traceSection}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.inlineAction}
      >
        <Text style={styles.actionText}>
          {expanded ? '收起来源记录' : `查看 ${readingIds.length} 条来源记录`}
        </Text>
        <Ionicons color={colors.accent} name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
      </Pressable>
      {expanded ? <ReadingTraceLinks readingIds={readingIds} onOpen={onOpen} /> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  actionText: {
    color: colors.accent,
    fontWeight: '700',
  },
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
  dateInput: {
    flex: 1,
    minWidth: 180,
  },
  dateInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  filterSummary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 64,
    padding: spacing.md,
  },
  filterSummaryCopy: {
    flex: 1,
    gap: spacing.xs,
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
  cardInsight: {
    gap: spacing.md,
  },
  interpretationItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  inlineAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },
  searchResult: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  searchResultCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  searchResults: {
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  searchResultsViewport: {
    maxHeight: 300,
  },
  countBadge: {
    color: colors.accent,
    fontWeight: '700',
  },
  textButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
  },
  traceSection: {
    gap: spacing.xs,
  },
  viewTab: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 2,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: spacing.sm,
  },
  viewTabActive: {
    borderBottomColor: colors.accent,
  },
  viewTabTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  viewTabs: {
    backgroundColor: colors.surface,
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
