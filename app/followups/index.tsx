import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { FollowUpListCard } from '../../src/features/followups/components/FollowUpListCard';
import { useFollowUpList } from '../../src/features/followups/useFollowUps';
import { calculateOutcomeDistribution } from '../../src/features/followups/followUpStatistics';
import { outcomeLabels } from '../../src/features/followups/followUpPresentation';
import type { FollowUpStatus } from '../../src/domain/types';
import { spacing } from '../../src/theme/tokens';

export default function FollowUpListScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<FollowUpStatus | undefined>();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { items: allItems, loading, error, reload } = useFollowUpList({});
  const items = status ? allItems.filter((item) => item.followUp.status === status) : allItems;
  const distribution = calculateOutcomeDistribution(allItems.map((item) => item.followUp));
  return (
    <Screen scroll>
      <Text variant="title">后来发生了什么</Text>
      <Text variant="muted">这些记录用于回顾认知变化，不用于判断塔罗是否准确。</Text>
      <View style={styles.filters}>
        <Button label="全部" onPress={() => setStatus(undefined)} />
        <Button label="待回顾" onPress={() => setStatus('scheduled')} />
        <Button label="已完成" onPress={() => setStatus('completed')} />
      </View>
      <View style={styles.statistics}>
        <Text variant="subtitle">后来情况分类</Text>
        <Text variant="muted">
          只统计已完成回顾；同一 Reading 的多次回顾按多次真实记录计算。总计{' '}
          {distribution.completedCount} 条。
        </Text>
        {Object.values(distribution.items).map((entry) => (
          <View key={entry.outcome} style={styles.statRow}>
            <Text>
              {outcomeLabels[entry.outcome]}：{entry.count} · {(entry.ratio * 100).toFixed(0)}%
            </Text>
            {entry.followUpIds[0] ? (
              <Button
                label="查看来源"
                onPress={() =>
                  router.push({
                    pathname: '/followups/[followUpId]',
                    params: { followUpId: entry.followUpIds[0]! },
                  })
                }
              />
            ) : null}
          </View>
        ))}
      </View>
      {loading ? <Text accessibilityRole="progressbar">正在加载回顾…</Text> : null}
      {error ? (
        <>
          <Text accessibilityLiveRegion="polite">{error}</Text>
          <Button label="重试" onPress={() => void reload()} />
        </>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <Text variant="muted">当前没有符合条件的回顾。</Text>
      ) : null}
      {items.map((item) => (
        <FollowUpListCard
          key={item.followUp.id}
          item={item}
          timezone={timezone}
          onOpen={() =>
            router.push({
              pathname: '/followups/[followUpId]',
              params: { followUpId: item.followUp.id },
            })
          }
          onReading={() =>
            router.push({
              pathname: '/readings/[readingId]',
              params: { readingId: item.followUp.readingId },
            })
          }
        />
      ))}
      <Button label="返回首页" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statistics: { gap: spacing.sm },
  statRow: { gap: spacing.xs },
});
