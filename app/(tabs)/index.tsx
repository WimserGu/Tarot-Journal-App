import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { FloatingActionButton } from '@/features/home/components/FloatingActionButton';
import { TodayQuestionCard } from '@/features/home/components/TodayQuestionCard';
import { TopicSummaryCard } from '@/features/home/components/TopicSummaryCard';
import { buildHomeData, formatHomeDate } from '@/features/home/homeData';
import { useJournalSnapshot } from '@/repositories/useJournalSnapshot';
import { FollowUpListCard } from '@/features/followups/components/FollowUpListCard';
import { addFollowUpCalendarDays } from '@/features/followups/followUpDate';
import { usePendingFollowUps } from '@/features/followups/useFollowUps';
import {
  buildPendingFollowUpModel,
  followUpDetailRoute,
  followUpReadingRoute,
} from '@/features/followups/followUpPageModel';
import { followUpRepository } from '@/repositories/repositoryFactory';
import { spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const journalData = useJournalSnapshot();
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const pending = usePendingFollowUps({ now: now.toISOString(), timezone: timeZone });
  const pendingModel = buildPendingFollowUpModel(pending.items);
  const homeData = buildHomeData({
    now,
    time_zone: timeZone,
    topics: journalData.topics,
    question_templates: journalData.question_templates,
    readings: journalData.readings,
    reading_cards: journalData.reading_cards,
    tarot_cards: journalData.tarot_cards,
  });

  return (
    <View style={styles.root}>
      <Screen scroll>
        <View style={styles.header}>
          <Text variant="eyebrow">{formatHomeDate(now, timeZone)}</Text>
          <Text variant="title">{homeData.greeting}</Text>
        </View>

        <View style={styles.section}>
          <Text variant="subtitle">创建 Reading</Text>
          <Button label="即时抽牌" onPress={() => router.push('/draw' as Href)} />
          <Button label="手动录入实体牌" onPress={() => router.push('/readings/new')} />
        </View>

        <View style={styles.section}>
          <Text variant="subtitle">待回顾</Text>
          <Text variant="muted">
            已到期 {pendingModel.overdueCount} · 今天 {pendingModel.dueTodayCount}
          </Text>
          {pending.loading ? <Text accessibilityRole="progressbar">正在加载待回顾…</Text> : null}
          {pending.error ? <Text accessibilityLiveRegion="polite">{pending.error}</Text> : null}
          {!pending.loading && !pending.error && pendingModel.isEmpty ? (
            <Text variant="muted">目前没有到期或即将到期的回顾。</Text>
          ) : null}
          {pendingModel.visibleItems.map((item) => (
            <FollowUpListCard
              key={item.followUp.id}
              item={item}
              timezone={timeZone}
              onOpen={() => router.push(followUpDetailRoute(item.followUp.id))}
              onReading={() => router.push(followUpReadingRoute(item.followUp.readingId))}
              onSnooze7={() => {
                setFollowUpError(null);
                void followUpRepository
                  .snoozeFollowUp(
                    item.followUp.id,
                    addFollowUpCalendarDays(now.toISOString(), timeZone, 7),
                  )
                  .catch(() => setFollowUpError('暂时无法稍后提醒，请重试。'));
              }}
              onSnooze30={() => {
                setFollowUpError(null);
                void followUpRepository
                  .snoozeFollowUp(
                    item.followUp.id,
                    addFollowUpCalendarDays(now.toISOString(), timeZone, 30),
                  )
                  .catch(() => setFollowUpError('暂时无法稍后提醒，请重试。'));
              }}
            />
          ))}
          {followUpError ? <Text accessibilityLiveRegion="polite">{followUpError}</Text> : null}
          <Button label="查看全部回顾" onPress={() => router.push('/followups')} />
        </View>

        <View style={styles.section}>
          <Text variant="subtitle">今日固定问题</Text>
          {homeData.today_questions.length > 0 ? (
            homeData.today_questions.map((question) => (
              <TodayQuestionCard
                key={question.question_template.id}
                question={question}
                timeZone={timeZone}
                onStart={() => {
                  router.push({
                    pathname: '/readings/new',
                    params: {
                      topicId: question.topic.id,
                      questionTemplateId: question.question_template.id,
                    },
                  });
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text variant="subtitle">今天没有固定问题</Text>
              <Text variant="muted">稍后再回来查看。</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="subtitle">长期议题</Text>
          {homeData.topics.length > 0 ? (
            homeData.topics.map((summary) => (
              <TopicSummaryCard
                key={summary.topic.id}
                summary={summary}
                timeZone={timeZone}
                onPress={() => {
                  router.push({
                    pathname: '/topics/[topicId]',
                    params: { topicId: summary.topic.id },
                  });
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text variant="subtitle">还没有长期议题</Text>
              <Button label="前往议题" onPress={() => router.push('/topics')} />
            </View>
          )}
        </View>

        <View style={styles.floatingButtonSpacer} />
      </Screen>

      <View style={styles.floatingButton}>
        <FloatingActionButton onPress={() => router.push('/readings/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  floatingButton: {
    bottom: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  floatingButtonSpacer: {
    height: 72,
  },
  header: {
    gap: spacing.xs,
  },
  root: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
});
