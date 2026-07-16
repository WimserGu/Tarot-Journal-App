import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  EmptyMysticState,
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import { FollowUpListCard } from '../../src/features/followups/components/FollowUpListCard';
import { useFollowUpList } from '../../src/features/followups/useFollowUps';
import { calculateOutcomeDistribution } from '../../src/features/followups/followUpStatistics';
import { outcomeLabels } from '../../src/features/followups/followUpPresentation';
import type { FollowUpStatus } from '../../src/domain/types';
import { useAppTheme } from '@/theme/useAppTheme';

export default function FollowUpListScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [status, setStatus] = useState<FollowUpStatus | undefined>();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { items: allItems, loading, error, reload } = useFollowUpList({});
  const items = status ? allItems.filter((item) => item.followUp.status === status) : allItems;
  const distribution = calculateOutcomeDistribution(allItems.map((item) => item.followUp));
  return (
    <Screen maxWidth={900} scroll>
      <MysticHeader
        onBack={() => router.back()}
        subtitle="这些记录用于回顾认知变化，不用于判断塔罗是否准确。"
        title="后来发生了什么"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <Button
          label="全部"
          onPress={() => setStatus(undefined)}
          variant={status === undefined ? 'primary' : 'secondary'}
        />
        <Button
          label="待回顾"
          onPress={() => setStatus('scheduled')}
          variant={status === 'scheduled' ? 'primary' : 'secondary'}
        />
        <Button
          label="已完成"
          onPress={() => setStatus('completed')}
          variant={status === 'completed' ? 'primary' : 'secondary'}
        />
      </View>
      <GlassPanel variant="subtle">
        <Text variant="subtitle">后来情况分类</Text>
        <Text variant="muted">
          只统计已完成回顾；同一 Reading 的多次回顾按多次真实记录计算。总计{' '}
          {distribution.completedCount} 条。
        </Text>
        {Object.values(distribution.items).map((entry) => (
          <View key={entry.outcome} style={{ gap: theme.spacing.xs }}>
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
      </GlassPanel>
      {loading ? <Text accessibilityRole="progressbar">正在加载回顾…</Text> : null}
      {error ? (
        <>
          <Text accessibilityLiveRegion="polite">{error}</Text>
          <Button label="重试" onPress={() => void reload()} />
        </>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyMysticState
          description="调整筛选条件，或从一条 Reading 安排新的回顾。"
          title="当前没有符合条件的回顾"
        />
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
      <Button label="返回首页" onPress={() => router.replace('/')} variant="ghost" />
    </Screen>
  );
}
