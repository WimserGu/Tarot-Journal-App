import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { orientationLabel } from '@/features/topics/topicPresentation';
import { useReadingDetail } from '@/features/readings/useReadings';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatReadingDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ReadingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ readingId?: string | string[] }>();
  const readingId = firstRouteParam(params.readingId);
  const {
    data: detail,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useReadingDetail(readingId);

  if (isLoading) {
    return (
      <Screen>
        <Text variant="muted">正在加载记录…</Text>
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen>
        <Text>{errorMessage}</Text>
        <Button label="重新加载" onPress={() => void reload()} />
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen>
        <Text variant="subtitle">找不到这条记录</Text>
        <Button label="返回议题" onPress={() => router.replace('/topics')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <IconButton accessibilityLabel="返回" icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.statusLabel}>
          {detail.reading.status === 'draft' ? '草稿已保存' : '记录已保存'}
        </Text>
      </View>

      <View style={styles.context}>
        <Text variant="eyebrow">{detail.topic.title}</Text>
        <Text variant="title">{detail.question_text}</Text>
        <Text variant="muted">
          {formatReadingDateTime(detail.reading.reading_at, detail.reading.reading_timezone)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">牌面</Text>
        {detail.cards.length > 0 ? (
          detail.cards.map(({ reading_card: readingCard, tarot_card: tarotCard }) => (
            <View key={readingCard.id} style={styles.cardRow}>
              <Text>{readingCard.position_name ?? `第 ${readingCard.position_order} 张牌`}</Text>
              <Text>
                {tarotCard ? tarotCard.name_zh : '尚未选择牌'} ·{' '}
                {orientationLabel(readingCard.orientation)}
              </Text>
            </View>
          ))
        ) : (
          <Text variant="muted">这个草稿还没有牌面。</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="subtitle">个人解读</Text>
        <Text variant={detail.reading.interpretation ? 'body' : 'muted'}>
          {detail.reading.interpretation ?? '尚未填写'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  context: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  statusLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
