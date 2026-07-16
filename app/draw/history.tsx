import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  EmptyMysticState,
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import type { DrawSession } from '@/features/draw/drawTypes';
import {
  filterAndSortDrawSessions,
  type DrawHistorySort,
  type DrawHistoryStatusFilter,
} from '@/features/draw/drawSessionPresentation';
import { drawSessionRepository } from '@/repositories/repositoryFactory';
import { drawRouteForSession } from '@/features/draw/drawModeRoutes';
import { useAppTheme } from '@/theme/useAppTheme';

export default function DrawHistoryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
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
    <Screen maxWidth={900} scroll>
      <MysticHeader
        eyebrow="Draw history"
        onBack={() => router.back()}
        subtitle="草稿不会进入统计或复盘；已保存抽牌保留原始结果。"
        title="抽牌历史"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <Button
          label={sort === 'newest' ? '最新优先' : '最早优先'}
          onPress={() => setSort((current) => (current === 'newest' ? 'oldest' : 'newest'))}
          variant="secondary"
        />
        {(['all', 'draft', 'saved'] as const).map((status) => (
          <Button
            key={status}
            label={status === 'all' ? '全部' : status === 'draft' ? '草稿' : '已保存'}
            onPress={() => setFilter(status)}
            variant={filter === status ? 'primary' : 'secondary'}
          />
        ))}
      </View>
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
      {visibleSessions.length === 0 ? (
        <EmptyMysticState
          description="完成一次抽牌后，它会在这里保留原始牌面和关联 Reading。"
          title="没有符合条件的抽牌"
        />
      ) : null}
      {visibleSessions.map((session) => (
        <GlassPanel key={session.id}>
          <Text variant="subtitle">{session.spreadId ?? '未命名牌阵'}</Text>
          <Text variant="muted">
            {new Date(session.createdAt).toLocaleString()} · {session.cards.length} 张 ·{' '}
            {session.status}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Button label="打开详情" onPress={() => router.push(`/draw/${session.id}` as never)} />
            {session.status === 'draft' ? (
              <>
                <Button
                  label="继续草稿"
                  onPress={() => router.replace(drawRouteForSession(session))}
                  variant="secondary"
                />
                <Button
                  label="删除草稿"
                  onPress={() =>
                    void drawSessionRepository
                      .delete(session.id)
                      .catch(() => setError('无法删除草稿。'))
                  }
                  variant="destructive"
                />
              </>
            ) : null}
          </View>
        </GlassPanel>
      ))}
    </Screen>
  );
}
