import { useRouter } from 'expo-router';
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
import { spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const journalData = useJournalSnapshot();
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
