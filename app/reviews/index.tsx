import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import { reviewCoordinator } from '@/features/reviews/reviewCoordinator';
import {
  getReviewPeriod,
  reviewPeriodAnchorDate,
  shiftReviewPeriod,
} from '@/features/reviews/reviewPeriod';
import { formatReviewPeriod, reviewDetailRoute } from '@/features/reviews/reviewPresentation';
import type { ReviewPreview, ReviewType } from '@/features/reviews/reviewTypes';
import { useReviewList } from '@/features/reviews/useReviews';
import { ReadingTraceLinks } from '@/features/statistics/components/ReadingTraceLinks';
import {
  defaultStatisticsFilter,
  type StatisticsFilter,
} from '@/features/statistics/statisticsTypes';
import { reviewRepository } from '@/repositories/repositoryFactory';
import type { AppTheme } from '@/theme/types';
import { useAppTheme } from '@/theme/useAppTheme';

const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export default function ReviewsScreen() {
  const router = useRouter();
  const styles = useReviewStyles();
  const { theme } = useAppTheme();
  const [now] = useState(() => new Date().toISOString());
  const [reviewType, setReviewType] = useState<ReviewType>('weekly');
  const [anchor, setAnchor] = useState(now.slice(0, 10));
  const [timezone, setTimezone] = useState(localTimezone);
  const [filter, setFilter] = useState<StatisticsFilter>(defaultStatisticsFilter);
  const [preview, setPreview] = useState<ReviewPreview | null>(null);
  const [summary, setSummary] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { reviews, loading: listLoading, error: listError } = useReviewList(reviewType);
  const period = useMemo(() => {
    try {
      return getReviewPeriod(reviewType, `${anchor}T12:00:00.000Z`, timezone, now);
    } catch {
      return null;
    }
  }, [anchor, now, reviewType, timezone]);

  useEffect(() => {
    let active = true;
    if (!period) {
      setPreview(null);
      setLoading(false);
      setError('日期或 IANA 时区无效。');
      return;
    }
    setLoading(true);
    void Promise.all([
      reviewCoordinator.preview(
        reviewType,
        `${anchor}T12:00:00.000Z`,
        timezone,
        filter.includeDrafts,
      ),
      reviewRepository.getReviewForPeriod({
        reviewType,
        periodStart: period.periodStart,
        timezone,
      }),
    ])
      .then(([value, saved]) => {
        if (active) {
          setPreview(value);
          setExistingId(saved?.id ?? null);
          setError(null);
        }
      })
      .catch(() => active && setError('无法生成这个周期的回顾预览。'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [anchor, filter.includeDrafts, period, reviewType, timezone]);

  const move = (direction: -1 | 1) => {
    if (!period) return;
    try {
      setAnchor(reviewPeriodAnchorDate(shiftReviewPeriod(period, direction, now)));
    } catch {
      setError('不能选择尚未开始的未来周期。');
    }
  };
  const save = async () => {
    if (!preview || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const review = await reviewCoordinator.create(preview, summary || null);
      router.replace(reviewDetailRoute(review.id));
    } catch {
      setError('无法保存回顾；表单内容已保留。这个周期可能已有回顾。');
    } finally {
      setSubmitting(false);
    }
  };
  const openReading = (id: string) => router.push(`/readings/${id}`);

  return (
    <Screen maxWidth={920} scroll>
      <MysticHeader
        eyebrow="Traceable Reflections"
        onBack={() => router.back()}
        subtitle="所有统计都可以回到产生它们的 Reading。"
        title="每周与每月回顾"
      />
      <View style={styles.row}>
        <Choice
          label="Weekly"
          active={reviewType === 'weekly'}
          onPress={() => setReviewType('weekly')}
        />
        <Choice
          label="Monthly"
          active={reviewType === 'monthly'}
          onPress={() => setReviewType('monthly')}
        />
      </View>
      <View style={styles.row}>
        <Button label="上一周期" onPress={() => move(-1)} />
        <Button label="下一周期" onPress={() => move(1)} />
      </View>
      <TextInput
        accessibilityLabel="定位日期"
        value={anchor}
        onChangeText={setAnchor}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
      />
      <TextInput
        accessibilityLabel="IANA 时区"
        value={timezone}
        onChangeText={setTimezone}
        placeholder="Asia/Shanghai"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
      />
      <Choice
        label={`包含草稿：${filter.includeDrafts ? '是' : '否'}`}
        active={filter.includeDrafts}
        onPress={() => setFilter({ ...filter, includeDrafts: !filter.includeDrafts })}
      />
      {period ? (
        <View style={styles.card}>
          <Text variant="subtitle">{formatReviewPeriod(period)}</Text>
          <Text>{period.timezone}</Text>
          <Text variant="muted">{period.isInProgress ? '当前周期进行中' : '完整历史周期'}</Text>
        </View>
      ) : null}
      {loading ? <Text accessibilityRole="progressbar">正在生成回顾预览…</Text> : null}
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      {preview && !loading ? (
        <>
          <View style={styles.metrics}>
            <Metric label="Readings" value={preview.snapshot.current.readingCount.count} />
            <Metric label="Cards" value={preview.snapshot.current.cardCount.count} />
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">最活跃 Topic</Text>
            {preview.snapshot.activeTopics[0] ? (
              <>
                <Text>
                  {preview.snapshot.activeTopics[0].topicTitle} ·{' '}
                  {preview.snapshot.activeTopics[0].readingCount} Readings
                </Text>
                <ReadingTraceLinks
                  readingIds={preview.snapshot.activeTopics[0].readingIds}
                  onOpen={openReading}
                />
              </>
            ) : (
              <Text variant="muted">这个周期还没有正式 Reading。</Text>
            )}
          </View>
          <View style={styles.card}>
            <Text variant="subtitle">最常出现的牌</Text>
            {preview.snapshot.topCards[0] ? (
              <>
                <Text>
                  {preview.snapshot.topCards[0].tarotCard.name_zh} ·{' '}
                  {preview.snapshot.topCards[0].totalCount} 次
                </Text>
                <ReadingTraceLinks
                  readingIds={preview.snapshot.topCards[0].readingIds}
                  onOpen={openReading}
                />
              </>
            ) : (
              <Text variant="muted">当前没有可统计的牌。</Text>
            )}
          </View>
          <TextInput
            accessibilityLabel="个人总结"
            multiline
            maxLength={5000}
            value={summary}
            onChangeText={setSummary}
            placeholder="写下你自己的事实性回顾（可选）"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.summary]}
          />
          {existingId ? (
            <Button
              label="打开已保存回顾"
              onPress={() => router.push(reviewDetailRoute(existingId))}
            />
          ) : (
            <Button
              label={submitting ? '正在保存…' : '保存 Review'}
              disabled={submitting}
              onPress={() => void save()}
            />
          )}
        </>
      ) : null}
      <View style={styles.card}>
        <Text variant="subtitle">已保存回顾</Text>
        {listLoading ? <Text accessibilityRole="progressbar">正在加载…</Text> : null}
        {listError ? <Text accessibilityLiveRegion="polite">{listError}</Text> : null}
        {!listLoading && reviews.length === 0 ? (
          <Text variant="muted">还没有已保存的回顾。</Text>
        ) : (
          reviews.map((review) => (
            <Pressable
              accessibilityRole="button"
              key={review.id}
              onPress={() => router.push(reviewDetailRoute(review.id))}
              style={styles.saved}
            >
              <Text>
                {review.reviewType === 'weekly' ? 'Weekly' : 'Monthly'} ·{' '}
                {review.periodStart.slice(0, 10)}
              </Text>
              <Text variant="muted">
                {review.readingCount} Readings · {review.cardCount} Cards
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useReviewStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.choice, active ? styles.active : null]}
    >
      <Text style={active ? styles.activeText : null}>{label}</Text>
    </Pressable>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  const styles = useReviewStyles();
  return (
    <View style={styles.metric}>
      <Text variant="subtitle">{value}</Text>
      <Text variant="muted">{label}</Text>
    </View>
  );
}
function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    choice: {
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.pill,
      borderWidth: theme.borders.hairline,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
    },
    active: { backgroundColor: theme.colors.primary },
    activeText: { color: theme.colors.textPrimary },
    input: {
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: theme.borders.hairline,
      color: theme.colors.textPrimary,
      minHeight: 48,
      padding: theme.spacing.md,
    },
    summary: { minHeight: 140, textAlignVertical: 'top' },
    card: {
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: theme.borders.hairline,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    metrics: { flexDirection: 'row', gap: theme.spacing.sm },
    metric: {
      backgroundColor: theme.colors.glassElevated,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: theme.borders.hairline,
      flex: 1,
      padding: theme.spacing.lg,
    },
    saved: {
      borderBottomColor: theme.colors.divider,
      borderBottomWidth: 1,
      justifyContent: 'center',
      minHeight: 52,
      paddingVertical: theme.spacing.sm,
    },
  });
}

function useReviewStyles() {
  const { theme } = useAppTheme();
  return createStyles(theme);
}
