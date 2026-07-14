import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { Reading } from '@/domain/types';
import { linkedReadingIsMissing } from '@/features/draw/drawSessionPresentation';
import type { DrawSession } from '@/features/draw/drawTypes';
import { drawSessionRepository } from '@/repositories/repositoryFactory';
import { tarotCards } from '@/domain/tarotCards';
import { CardArtwork } from '@/features/draw/components/CardArtwork';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function orientationLabel(session: DrawSession['cards'][number]): string {
  if (session.orientation === 'upright') return '正位';
  if (session.reversalExpression === 'underexpressed') return '逆位 · 表达不足';
  if (session.reversalExpression === 'overexpressed') return '逆位 · 表达过度';
  return '逆位';
}

export default function DrawSessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ drawSessionId?: string | string[] }>();
  const id = firstRouteParam(params.drawSessionId);
  const [session, setSession] = useState<DrawSession | null>(null);
  const [relatedReadings, setRelatedReadings] = useState<Reading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cardsById = new Map(tarotCards.map((card) => [card.id, card]));
  const load = useCallback(() => {
    if (!id) {
      setError('缺少抽牌标识。');
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([drawSessionRepository.get(id), drawSessionRepository.listRelatedReadings(id)])
      .then(([nextSession, readings]) => {
        setSession(nextSession);
        setRelatedReadings(readings);
        setError(null);
      })
      .catch(() => setError('无法加载这次抽牌。'))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    load();
    return drawSessionRepository.subscribe(load);
  }, [load]);
  if (loading)
    return (
      <Screen>
        <Text variant="muted">正在加载抽牌…</Text>
      </Screen>
    );
  if (error || !session)
    return (
      <Screen>
        <Text>{error ?? '找不到这次抽牌。'}</Text>
        <Button label="返回抽牌历史" onPress={() => router.replace('/draw/history' as never)} />
      </Screen>
    );
  const missingLinkedReading = linkedReadingIsMissing(session, relatedReadings);
  return (
    <Screen scroll>
      <Text variant="eyebrow">Draw session</Text>
      <Text variant="title">抽牌详情</Text>
      <Text variant="muted">
        {new Date(session.createdAt).toLocaleString()} · {session.spreadId ?? '未命名牌阵'} ·{' '}
        {session.status}
      </Text>
      <View style={styles.section}>
        <Text variant="subtitle">配置</Text>
        <Text>
          抽取 {session.configuration.cardCount} 张 · {session.configuration.reversalMode} 逆位模式
        </Text>
      </View>
      <View style={styles.section}>
        <Text variant="subtitle">原始牌面</Text>
        {session.cards.map((card) => {
          const tarotCard = cardsById.get(card.tarotCardId);
          return (
            <View key={card.id} style={styles.card}>
              <CardArtwork
                accessibilityLabel={`${tarotCard?.name_zh ?? '未知牌面'}，${orientationLabel(card)}`}
                cardId={card.tarotCardId}
                orientation={card.orientation}
                size="table"
              />
              <Text variant="subtitle">
                {card.positionSnapshot ?? `第 ${card.positionIndex + 1} 张`}
              </Text>
              <Text>{tarotCard?.name_zh ?? '未知牌面'}</Text>
              <Text variant="muted">{tarotCard?.name_en}</Text>
              <Text>{orientationLabel(card)}</Text>
              <Text variant="muted">来源：{card.source === 'drawn' ? 'App 抽取' : '手动补充'}</Text>
              <Text variant="muted">创建于 {new Date(session.createdAt).toLocaleString()}</Text>
            </View>
          );
        })}
      </View>
      {missingLinkedReading ? <Text variant="muted">此前关联的 Reading 已不存在。</Text> : null}
      <View style={styles.section}>
        <Text variant="subtitle">关联 Reading</Text>
        {relatedReadings.length === 0 ? (
          <Text variant="muted">尚未从此抽牌创建 Reading。</Text>
        ) : (
          relatedReadings.map((reading) => (
            <Button
              key={reading.id}
              label={`${new Date(reading.reading_at).toLocaleDateString()} · 打开 Reading`}
              onPress={() =>
                router.push({
                  pathname: '/readings/[readingId]',
                  params: { readingId: reading.id },
                })
              }
            />
          ))
        )}
        <Button
          label={relatedReadings.length > 0 ? '再创建一个 Reading' : '创建 Reading'}
          onPress={() =>
            router.push({ pathname: '/readings/new', params: { drawSessionId: session.id } })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  section: { gap: spacing.md },
});
