import { useEffect, useState, type PropsWithChildren } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { reviewCoordinator } from '@/features/reviews/reviewCoordinator';
import { formatReviewPeriod, signedDelta } from '@/features/reviews/reviewPresentation';
import type { Review } from '@/features/reviews/reviewTypes';
import { ReadingTraceLinks } from '@/features/statistics/components/ReadingTraceLinks';
import { reviewRepository } from '@/repositories/repositoryFactory';
import { borderRadii, colors, spacing } from '@/theme/tokens';

export default function ReviewDetailScreen() {
  const router = useRouter();
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [summary, setSummary] = useState('');
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!reviewId) return;
    void reviewRepository
      .getReview(reviewId)
      .then(async (value) => {
        if (!active) return;
        setReview(value);
        setSummary(value?.personalSummary ?? '');
        setChanged(value ? await reviewCoordinator.hasSourceChanged(value) : false);
        setError(value ? null : '未找到这条 Review。');
      })
      .catch(() => active && setError('无法加载 Review。'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reviewId]);

  const saveSummary = async () => {
    if (!review || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      setReview(await reviewRepository.updateSummary(review.id, summary || null));
    } catch {
      setError('保存失败；你的总结仍保留在表单中。');
    } finally {
      setSubmitting(false);
    }
  };
  const regenerate = async () => {
    if (!review || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      setReview(await reviewCoordinator.regenerate(review));
      setChanged(false);
    } catch {
      setError('无法重新生成统计，已保存快照和总结没有改变。');
    } finally {
      setSubmitting(false);
    }
  };
  const confirmDelete = () =>
    review &&
    Alert.alert('删除 Review？', '只会删除这条 Review，不会删除 Reading、Topic、固定问题或牌。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () =>
          void reviewRepository.deleteReview(review.id).then(
            () => router.replace('/reviews' as Href),
            () => setError('无法删除 Review。'),
          ),
      },
    ]);
  const openReading = (id: string) => router.push(`/readings/${id}`);

  if (loading)
    return (
      <Screen>
        <Text accessibilityRole="progressbar">正在加载 Review…</Text>
      </Screen>
    );
  if (!review)
    return (
      <Screen>
        <Text accessibilityLiveRegion="polite">{error ?? '未找到 Review。'}</Text>
        <Button label="返回 Review 列表" onPress={() => router.replace('/reviews' as Href)} />
      </Screen>
    );
  const snapshot = review.statisticsSnapshot;
  return (
    <Screen scroll>
      <Button label="返回" onPress={() => router.back()} />
      <Text variant="eyebrow">
        {review.reviewType === 'weekly' ? 'Weekly Review' : 'Monthly Review'}
      </Text>
      <Text variant="title">{formatReviewPeriod(review)}</Text>
      <Text>
        {review.timezone} · {review.status === 'in_progress' ? '当前周期进行中' : '完整历史周期'}
      </Text>
      {changed ? (
        <View style={styles.notice}>
          <Text>来源数据自快照生成后发生了变化。已保存统计不会自动覆盖。</Text>
          <Button
            label={submitting ? '正在重新生成…' : '重新生成统计'}
            disabled={submitting}
            onPress={() => void regenerate()}
          />
        </View>
      ) : null}
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      <View style={styles.metrics}>
        <Metric label="Readings" value={snapshot.current.readingCount.count} />
        <Metric label="Cards" value={snapshot.current.cardCount.count} />
      </View>
      <Section title="最活跃 Topic">
        {snapshot.activeTopics[0] ? (
          <>
            <Text>
              {snapshot.activeTopics[0].topicTitle} · {snapshot.activeTopics[0].readingCount}{' '}
              Readings
            </Text>
            <ReadingTraceLinks
              readingIds={snapshot.activeTopics[0].readingIds}
              onOpen={openReading}
            />
          </>
        ) : (
          <Text variant="muted">这个周期还没有正式 Reading。</Text>
        )}
      </Section>
      <Section title="最常出现的牌">
        {snapshot.topCards.length === 0 ? (
          <Text variant="muted">当前没有可统计的牌。</Text>
        ) : (
          snapshot.topCards.slice(0, 5).map((card) => (
            <View key={card.tarotCard.id} style={styles.item}>
              <Text>
                {card.tarotCard.name_zh} · {card.totalCount} 次 · 正位 {card.uprightCount} · 逆位{' '}
                {card.reversedCount}
              </Text>
              <ReadingTraceLinks readingIds={card.readingIds} onOpen={openReading} />
            </View>
          ))
        )}
      </Section>
      <Section title="历史首次出现">
        {snapshot.firstEverCards.length === 0 ? (
          <Text variant="muted">这个周期没有历史首次出现的牌。</Text>
        ) : (
          snapshot.firstEverCards.map((card) => (
            <View key={card.tarotCard.id} style={styles.item}>
              <Text>
                {card.tarotCard.name_zh} · 本周期 {card.appearanceCountInPeriod} 次
              </Text>
              <ReadingTraceLinks readingIds={card.readingIds} onOpen={openReading} />
            </View>
          ))
        )}
      </Section>
      <Section title="与上一周期比较">
        <Text>
          Readings：
          {signedDelta(snapshot.current.readingCount.count - snapshot.previous.readingCount.count)}
        </Text>
        <Text>
          Cards：{signedDelta(snapshot.current.cardCount.count - snapshot.previous.cardCount.count)}
        </Text>
        {snapshot.previous.readingCount.count === 0 ? (
          <Text variant="muted">上一周期没有可比较的记录。</Text>
        ) : null}
        {snapshot.largestIncreases.map((item) => (
          <View key={`up-${item.tarotCard.id}`} style={styles.item}>
            <Text>
              {item.tarotCard.name_zh}：{signedDelta(item.absoluteDelta)}
            </Text>
            <ReadingTraceLinks readingIds={item.currentSourceReadingIds} onOpen={openReading} />
          </View>
        ))}
        {snapshot.largestDecreases.map((item) => (
          <View key={`down-${item.tarotCard.id}`} style={styles.item}>
            <Text>
              {item.tarotCard.name_zh}：{signedDelta(item.absoluteDelta)}
            </Text>
            <ReadingTraceLinks readingIds={item.previousSourceReadingIds} onOpen={openReading} />
          </View>
        ))}
      </Section>
      <Section title="新增出现 / 未再出现">
        {snapshot.newlyAppearingCards.length === 0 &&
        snapshot.noLongerAppearingCards.length === 0 ? (
          <Text variant="muted">当前数据不足以形成这两类变化。</Text>
        ) : null}
        {snapshot.newlyAppearingCards.map((item) => (
          <View key={`new-${item.tarotCard.id}`} style={styles.item}>
            <Text>
              {item.tarotCard.name_zh} · 新增出现 {item.currentCount} 次
            </Text>
            <ReadingTraceLinks readingIds={item.currentSourceReadingIds} onOpen={openReading} />
          </View>
        ))}
        {snapshot.noLongerAppearingCards.map((item) => (
          <View key={`gone-${item.tarotCard.id}`} style={styles.item}>
            <Text>
              {item.tarotCard.name_zh} · 本周期未再出现（上一周期 {item.previousCount} 次）
            </Text>
            <ReadingTraceLinks readingIds={item.previousSourceReadingIds} onOpen={openReading} />
          </View>
        ))}
      </Section>
      <Section title="花色变化">
        {(['wands', 'cups', 'swords', 'pentacles'] as const).map((suit) => {
          const value = snapshot.suitChanges[suit];
          return (
            <View key={suit} style={styles.item}>
              <Text>
                {suit}：{value.previousCount} → {value.currentCount}，
                {signedDelta(value.absoluteDelta)}
              </Text>
              <ReadingTraceLinks readingIds={value.currentSourceReadingIds} onOpen={openReading} />
            </View>
          );
        })}
      </Section>
      <Section title="正逆位变化">
        {(['upright', 'reversed'] as const).map((orientation) => {
          const value = snapshot.orientationChanges[orientation];
          return (
            <View key={orientation} style={styles.item}>
              <Text>
                {orientation}：{value.previousCount} → {value.currentCount}，比例变化{' '}
                {(value.ratioDelta * 100).toFixed(1)}%
              </Text>
              <ReadingTraceLinks readingIds={value.currentSourceReadingIds} onOpen={openReading} />
            </View>
          );
        })}
      </Section>
      <Section title="最常记录的固定问题">
        {snapshot.topQuestions.length === 0 ? (
          <Text variant="muted">这个周期没有固定问题记录。</Text>
        ) : (
          snapshot.topQuestions.map((question) => (
            <View
              key={`${question.questionTemplateId}:${question.questionText}`}
              style={styles.item}
            >
              <Text>
                {question.questionText} · {question.readingCount} 次
              </Text>
              <ReadingTraceLinks readingIds={question.readingIds} onOpen={openReading} />
            </View>
          ))
        )}
      </Section>
      <Section title="数据来源">
        <Text>{review.sourceReadingIds.length} Readings</Text>
        <ReadingTraceLinks readingIds={review.sourceReadingIds} onOpen={openReading} />
      </Section>
      <Text variant="subtitle">我的总结</Text>
      <TextInput
        accessibilityLabel="个人总结"
        multiline
        maxLength={5000}
        value={summary}
        onChangeText={setSummary}
        style={styles.summary}
      />
      <Button
        label={submitting ? '正在保存…' : '保存总结'}
        disabled={submitting}
        onPress={() => void saveSummary()}
      />
      <Button label="删除 Review" onPress={confirmDelete} />
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text variant="subtitle">{value}</Text>
      <Text variant="muted">{label}</Text>
    </View>
  );
}
function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.card}>
      <Text variant="subtitle">{title}</Text>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  notice: {
    backgroundColor: '#fff2c7',
    borderRadius: borderRadii.md,
    gap: spacing.sm,
    padding: spacing.md,
  },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: {
    backgroundColor: colors.surface,
    borderRadius: borderRadii.md,
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadii.md,
    gap: spacing.sm,
    padding: spacing.md,
  },
  item: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 160,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
});
