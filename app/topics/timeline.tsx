import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import {
  SelectionModal,
  type SelectionOption,
} from '@/features/readings/components/SelectionModal';
import type { TopicTimelineFilters } from '@/features/readings/readingRepository';
import { useReadingFormContext, useTopicTimeline } from '@/features/readings/useReadings';
import { IconButton } from '@/features/topics/components/IconButton';
import { formatTopicDate, orientationLabel } from '@/features/topics/topicPresentation';
import { borderRadii, colors, fontSizes, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type TimelineFilterState = Omit<TopicTimelineFilters, 'topic_id'>;

const emptyFilters: TimelineFilterState = {};

function hasFilters(filters: TimelineFilterState): boolean {
  return Object.values(filters).some((value) => value !== undefined && value !== '');
}

export default function TopicTimelineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const topicId = firstRouteParam(params.topicId);
  const [filters, setFilters] = useState<TimelineFilterState>(emptyFilters);
  const [isQuestionPickerVisible, setQuestionPickerVisible] = useState(false);
  const timelineFilters = useMemo<TopicTimelineFilters | null>(
    () => (topicId ? { ...filters, topic_id: topicId } : null),
    [filters, topicId],
  );
  const timeline = useTopicTimeline(timelineFilters);
  const formContext = useReadingFormContext();
  const topicQuestions = (formContext.data?.question_templates ?? []).filter(
    (question) => question.topic_id === topicId,
  );
  const questionOptions: SelectionOption[] = topicQuestions.map((question) => ({
    id: question.id,
    label: question.question_text,
  }));
  const selectedQuestion = topicQuestions.find(
    (question) => question.id === filters.question_template_id,
  );
  const activeFilters = hasFilters(filters);

  if (!topicId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.state}>
          <Text variant="subtitle">缺少议题标识</Text>
          <Button label="返回议题列表" onPress={() => router.replace('/topics')} />
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: (typeof timeline.data)[number] }) => (
    <Pressable
      accessibilityLabel={`查看 ${item.question_text} 的记录详情`}
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/readings/[readingId]', params: { readingId: item.reading.id } })
      }
      style={({ pressed }) => [styles.timelineItem, pressed ? styles.pressed : null]}
    >
      <View style={styles.itemHeader}>
        <Text>{formatTopicDate(item.reading.reading_at, item.reading.reading_timezone)}</Text>
        <View style={styles.itemBadges}>
          <Text style={item.reading.status === 'draft' ? styles.draftBadge : styles.completedBadge}>
            {item.reading.status === 'draft' ? '草稿' : '正式'}
          </Text>
          {item.reading.is_favorite ? <Text style={styles.favoriteBadge}>已收藏</Text> : null}
        </View>
      </View>
      <Text>{item.question_text}</Text>
      <Text variant="muted">
        {item.cards.length > 0
          ? item.cards
              .map((card) => {
                const position = card.position_name ? `${card.position_name}：` : '';
                return `${position}${card.tarot_card?.name_zh ?? '未选择牌面'} · ${orientationLabel(card.orientation)}`;
              })
              .join(' / ')
          : '尚未录入牌面'}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={timeline.data}
        keyExtractor={(item) => item.reading.id}
        ListEmptyComponent={
          timeline.is_loading ? (
            <Text variant="muted">正在加载时间线…</Text>
          ) : timeline.error_message ? (
            <View style={styles.state}>
              <Text>{timeline.error_message}</Text>
              <Button label="重新加载" onPress={() => void timeline.reload()} />
            </View>
          ) : (
            <View style={styles.state}>
              <Text variant="subtitle">
                {activeFilters ? '没有符合筛选条件的记录' : '这个议题还没有记录'}
              </Text>
              <Text variant="muted">
                {activeFilters
                  ? '尝试清除筛选条件后再查看。'
                  : '保存第一条牌阵记录后，它会按日期出现在这里。'}
              </Text>
              {activeFilters ? (
                <Button label="清除全部筛选" onPress={() => setFilters(emptyFilters)} />
              ) : null}
            </View>
          )
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.topBar}>
              <IconButton
                accessibilityLabel="返回议题详情"
                icon="arrow-back"
                onPress={() => router.back()}
              />
              <Text variant="title">议题时间线</Text>
              <View style={styles.topBarSpacer} />
            </View>
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Text variant="subtitle">筛选记录</Text>
                {activeFilters ? (
                  <Pressable
                    accessibilityLabel="清除全部筛选"
                    accessibilityRole="button"
                    onPress={() => setFilters(emptyFilters)}
                    style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.clearButtonLabel}>清除</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel="按固定问题筛选"
                accessibilityRole="button"
                onPress={() => setQuestionPickerVisible(true)}
                style={({ pressed }) => [styles.selector, pressed ? styles.pressed : null]}
              >
                <Text>{selectedQuestion?.question_text ?? '全部固定问题'}</Text>
              </Pressable>
              <TextInput
                accessibilityLabel="按牌名筛选"
                onChangeText={(cardQuery) =>
                  setFilters((current) => ({ ...current, card_query: cardQuery }))
                }
                placeholder="按中文或英文牌名筛选"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={filters.card_query ?? ''}
              />
              <View style={styles.dateRow}>
                <TextInput
                  accessibilityLabel="起始日期筛选"
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(dateFrom) =>
                    setFilters((current) => ({ ...current, date_from: dateFrom }))
                  }
                  placeholder="起始日期 YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.dateInput]}
                  value={filters.date_from ?? ''}
                />
                <TextInput
                  accessibilityLabel="结束日期筛选"
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(dateTo) =>
                    setFilters((current) => ({ ...current, date_to: dateTo }))
                  }
                  placeholder="结束日期 YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.dateInput]}
                  value={filters.date_to ?? ''}
                />
              </View>
              <View style={styles.filterRow}>
                {(['all', 'upright', 'reversed'] as const).map((orientation) => {
                  const selected =
                    orientation === 'all'
                      ? filters.orientation === undefined
                      : filters.orientation === orientation;
                  const label = orientation === 'all' ? '全部方向' : orientationLabel(orientation);

                  return (
                    <Pressable
                      accessibilityLabel={`按${label}筛选`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={orientation}
                      onPress={() =>
                        setFilters((current) => ({
                          ...current,
                          orientation: orientation === 'all' ? undefined : orientation,
                        }))
                      }
                      style={({ pressed }) => [
                        styles.filterChip,
                        selected ? styles.filterChipSelected : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={selected ? styles.filterChipSelectedText : undefined}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityLabel="仅显示收藏记录"
                  accessibilityRole="button"
                  accessibilityState={{ selected: filters.is_favorite === true }}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      is_favorite: current.is_favorite ? undefined : true,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.filterChip,
                    filters.is_favorite ? styles.filterChipSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={filters.is_favorite ? styles.filterChipSelectedText : undefined}>
                    仅收藏
                  </Text>
                </Pressable>
              </View>
            </View>
            {!timeline.is_loading && timeline.data.length > 0 ? (
              <Text variant="muted">共 {timeline.data.length} 条记录，按日期从新到旧排列。</Text>
            ) : null}
          </View>
        }
        renderItem={renderItem}
      />
      <SelectionModal
        emptyMessage="这个议题还没有固定问题。"
        onClose={() => setQuestionPickerVisible(false)}
        onSelect={(questionTemplateId) => {
          setFilters((current) => ({ ...current, question_template_id: questionTemplateId }));
          setQuestionPickerVisible(false);
        }}
        options={questionOptions}
        title="选择固定问题"
        visible={isQuestionPickerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  clearButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.xs },
  clearButtonLabel: { color: colors.accent, fontWeight: '700' },
  completedBadge: { color: colors.accent, fontWeight: '700' },
  content: { flexGrow: 1, gap: spacing.sm, padding: spacing.lg },
  dateInput: { flex: 1, minWidth: 150 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  draftBadge: { color: colors.textMuted, fontWeight: '700' },
  favoriteBadge: { color: colors.accent, fontWeight: '700' },
  filterChip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  filterChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipSelectedText: { color: colors.surface, fontWeight: '700' },
  filterHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterSection: { gap: spacing.sm },
  headerContent: { gap: spacing.lg, paddingBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.72 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  selector: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  state: { gap: spacing.md, paddingVertical: spacing.xl },
  timelineItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  topBarSpacer: { width: 44 },
});
