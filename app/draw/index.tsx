import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { tarotCards } from '@/domain/tarotCards';
import type { TarotCard } from '@/domain/types';
import {
  appendManualDrawCard,
  removeDrawnCard,
  replaceDrawnCard,
  setDrawnCardExpression,
  setDrawnCardOrientation,
} from '@/features/draw/drawEditor';
import { drawEngine } from '@/features/draw/drawEngine';
import { createDrawSession, setActiveDrawSession } from '@/features/draw/drawSessionStore';
import {
  DEFAULT_DRAW_CONFIGURATION,
  type DrawSession,
  type ReversalMode,
} from '@/features/draw/drawTypes';
import { TarotCardPickerModal } from '@/features/readings/components/TarotCardPickerModal';
import { borderRadii, colors, spacing } from '@/theme/tokens';

type PickerTarget = { kind: 'replace'; index: number } | { kind: 'append' } | null;

const modeLabels: Record<ReversalMode, string> = {
  disabled: '不使用逆位',
  standard: '普通逆位',
  expression: '逆位表达模式',
};

function expressionLabel(session: DrawSession, index: number): string {
  const card = session.cards[index]!;
  if (card.orientation === 'upright') return '正位';
  if (card.reversalExpression === 'underexpressed') return '逆位 · 表达不足';
  if (card.reversalExpression === 'overexpressed') return '逆位 · 表达过度';
  return '逆位';
}

export default function DrawScreen() {
  const router = useRouter();
  const [cardCount, setCardCount] = useState(1);
  const [reversalMode, setReversalMode] = useState<ReversalMode>('standard');
  const [session, setSession] = useState<DrawSession | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [error, setError] = useState<string | null>(null);
  const cardsById = useMemo(() => new Map(tarotCards.map((card) => [card.id, card])), []);

  const publish = (next: DrawSession) => {
    setSession(next);
    setActiveDrawSession(next);
    setError(null);
  };

  const startDraw = () => {
    try {
      const configuration = { ...DEFAULT_DRAW_CONFIGURATION, cardCount, reversalMode };
      const result = drawEngine.draw(tarotCards, configuration);
      publish(createDrawSession(result));
    } catch {
      setError('暂时无法完成抽牌，请检查配置后重试。');
    }
  };

  const selectCard = (tarotCard: TarotCard) => {
    if (!session || !pickerTarget) return;
    const duplicateIndex = session.cards.findIndex((card) => card.tarotCardId === tarotCard.id);
    if (
      duplicateIndex >= 0 &&
      (pickerTarget.kind === 'append' || duplicateIndex !== pickerTarget.index)
    ) {
      setError('同一次抽牌中不能重复添加同一张牌。');
      setPickerTarget(null);
      return;
    }
    const cards =
      pickerTarget.kind === 'append'
        ? appendManualDrawCard(session.cards, tarotCard, `manual-${session.cards.length + 1}`)
        : session.cards.map((card, index) =>
            index === pickerTarget.index ? replaceDrawnCard(card, tarotCard) : card,
          );
    publish({ ...session, cards });
    setPickerTarget(null);
  };

  const updateCard = (
    index: number,
    update: (card: DrawSession['cards'][number]) => DrawSession['cards'][number],
  ) => {
    if (!session) return;
    publish({
      ...session,
      cards: session.cards.map((card, candidate) => (candidate === index ? update(card) : card)),
    });
  };

  return (
    <Screen scroll>
      <Text variant="eyebrow">即时抽牌</Text>
      <Text variant="title">创建一次临时抽牌</Text>
      <Text variant="muted">
        抽牌结果只有保存为 Reading 后才会进入日记；随机结果不代表客观预测。
      </Text>

      {!session ? (
        <>
          <View style={styles.section}>
            <Text variant="subtitle">抽取数量</Text>
            <View style={styles.options}>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                <Pressable
                  accessibilityLabel={`抽取 ${count} 张牌`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: cardCount === count }}
                  key={count}
                  onPress={() => setCardCount(count)}
                  style={[styles.countOption, cardCount === count ? styles.selected : null]}
                >
                  <Text style={cardCount === count ? styles.selectedText : undefined}>{count}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Text variant="subtitle">逆位模式</Text>
            {(Object.keys(modeLabels) as ReversalMode[]).map((mode) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: reversalMode === mode }}
                key={mode}
                onPress={() => setReversalMode(mode)}
                style={[styles.modeOption, reversalMode === mode ? styles.selected : null]}
              >
                <Text style={reversalMode === mode ? styles.selectedText : undefined}>
                  {modeLabels[mode]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button label="开始抽牌" onPress={startDraw} />
          <Button
            label="退出且不保存"
            onPress={() => {
              setActiveDrawSession(null);
              router.back();
            }}
          />
        </>
      ) : (
        <>
          <Text variant="muted">
            {session.cards.length} 张 · {modeLabels[session.configuration.reversalMode]}
          </Text>
          {session.cards.map((card, index) => {
            const tarotCard = cardsById.get(card.tarotCardId);
            return (
              <View key={card.id} style={styles.resultCard}>
                <Text variant="subtitle">
                  第 {index + 1} 张 · {tarotCard?.name_zh ?? '未知牌'}
                </Text>
                <Text variant="muted">{tarotCard?.name_en}</Text>
                <Text>{expressionLabel(session, index)}</Text>
                <Text variant="muted">
                  来源：{card.source === 'drawn' ? 'App 抽取' : '手动添加'}
                </Text>
                <View style={styles.options}>
                  <Button
                    label="更换牌"
                    onPress={() => setPickerTarget({ kind: 'replace', index })}
                  />
                  <Button
                    label={card.orientation === 'upright' ? '设为逆位' : '设为正位'}
                    onPress={() =>
                      updateCard(index, (value) =>
                        setDrawnCardOrientation(
                          value,
                          value.orientation === 'upright' ? 'reversed' : 'upright',
                        ),
                      )
                    }
                  />
                  {card.orientation === 'reversed' ? (
                    <>
                      <Button
                        label="普通逆位"
                        onPress={() =>
                          updateCard(index, (value) => setDrawnCardExpression(value, null))
                        }
                      />
                      <Button
                        label="表达不足"
                        onPress={() =>
                          updateCard(index, (value) =>
                            setDrawnCardExpression(value, 'underexpressed'),
                          )
                        }
                      />
                      <Button
                        label="表达过度"
                        onPress={() =>
                          updateCard(index, (value) =>
                            setDrawnCardExpression(value, 'overexpressed'),
                          )
                        }
                      />
                    </>
                  ) : null}
                  <Button
                    label="删除"
                    onPress={() =>
                      publish({ ...session, cards: removeDrawnCard(session.cards, index) })
                    }
                  />
                </View>
              </View>
            );
          })}
          {session.cards.length < 10 ? (
            <Button label="手动补加一张牌" onPress={() => setPickerTarget({ kind: 'append' })} />
          ) : null}
          {session.cards.length > 0 ? (
            <Button
              label="保存为 Reading"
              onPress={() => {
                setActiveDrawSession(session);
                router.push({ pathname: '/readings/new', params: { drawSessionId: session.id } });
              }}
            />
          ) : null}
          <Button
            label="重新抽牌"
            onPress={() => {
              setSession(null);
              setActiveDrawSession(null);
            }}
          />
          <Button
            label="退出且不保存"
            onPress={() => {
              setActiveDrawSession(null);
              router.back();
            }}
          />
        </>
      )}

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <TarotCardPickerModal
        cards={tarotCards}
        onClose={() => setPickerTarget(null)}
        onSelect={selectCard}
        selectedCardIds={session?.cards.map((card) => card.tarotCardId) ?? []}
        visible={pickerTarget !== null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  countOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  error: { color: colors.danger },
  modeOption: {
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    minHeight: 48,
    padding: spacing.md,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  resultCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  section: { gap: spacing.sm },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectedText: { color: colors.surface, fontWeight: '700' },
});
