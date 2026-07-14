import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { DrawSession } from '@/features/draw/drawTypes';
import {
  filterAndSortDrawSessions,
  type DrawHistorySort,
  type DrawHistoryStatusFilter,
} from '@/features/draw/drawSessionPresentation';
import { drawSessionRepository } from '@/repositories/repositoryFactory';
import { colors, spacing } from '@/theme/tokens';
import { drawRouteForSession } from '@/features/draw/drawModeRoutes';

export default function DrawHistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DrawSession[]>([]);
  const [filter, setFilter] = useState<DrawHistoryStatusFilter>('all');
  const [sort, setSort] = useState<DrawHistorySort>('newest');
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    void drawSessionRepository
      .list()
      .then(setSessions)
      .catch(() => setError('无法加载抽牌历史。'));
  }, []);
  useEffect(() => {
    load();
    return drawSessionRepository.subscribe(load);
  }, [load]);
  const visibleSessions = filterAndSortDrawSessions(sessions, filter, sort);
  return (
    <Screen scroll>
      <Text variant="eyebrow">Draw history</Text>
      <Text variant="title">抽牌历史</Text>
      <Text variant="muted">草稿不会进入统计或复盘；已保存抽牌保留原始结果。</Text>
      <View style={styles.actions}>
        <Button
          label={sort === 'newest' ? '最新优先' : '最早优先'}
          onPress={() => setSort((current) => (current === 'newest' ? 'oldest' : 'newest'))}
        />
        {(['all', 'draft', 'saved'] as const).map((status) => (
          <Button
            key={status}
            label={status === 'all' ? '全部' : status === 'draft' ? '草稿' : '已保存'}
            onPress={() => setFilter(status)}
          />
        ))}
      </View>
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      {visibleSessions.length === 0 ? <Text variant="muted">没有符合条件的抽牌。</Text> : null}
      {visibleSessions.map((session) => (
        <View key={session.id} style={styles.card}>
          <Text variant="subtitle">{session.spreadId ?? '未命名牌阵'}</Text>
          <Text variant="muted">
            {new Date(session.createdAt).toLocaleString()} · {session.cards.length} 张 ·{' '}
            {session.status}
          </Text>
          <View style={styles.actions}>
            <Button label="打开详情" onPress={() => router.push(`/draw/${session.id}` as never)} />
            {session.status === 'draft' ? (
              <>
                <Button
                  label="继续草稿"
                  onPress={() => router.replace(drawRouteForSession(session))}
                />
                <Button
                  label="删除草稿"
                  onPress={() =>
                    void drawSessionRepository
                      .delete(session.id)
                      .catch(() => setError('无法删除草稿。'))
                  }
                />
              </>
            ) : null}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
