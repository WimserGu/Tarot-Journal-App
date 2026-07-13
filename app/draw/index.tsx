import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { tarotCards } from '@/domain/tarotCards';
import { FaceDownCard } from '@/features/draw/components/FaceDownCard';
import { RevealCard } from '@/features/draw/components/RevealCard';
import { RevealProgress } from '@/features/draw/components/RevealProgress';
import { revealCard, ritualState } from '@/features/draw/drawRitual';
import { setActiveDrawSession } from '@/features/draw/drawSessionStore';
import { DEFAULT_DRAW_CONFIGURATION, type DrawSession } from '@/features/draw/drawTypes';
import { drawSessionRepository } from '@/repositories/repositoryFactory';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function cardLabel(card: DrawSession['cards'][number]) {
  if (card.orientation === 'upright') return '正位';
  if (card.reversalExpression === 'underexpressed') return '逆位 · 表达不足';
  if (card.reversalExpression === 'overexpressed') return '逆位 · 表达过度';
  return '逆位';
}

export default function DrawScreen() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [session, setSession] = useState<DrawSession | null>(null);
  const [draft, setDraft] = useState<DrawSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const cardsById = useMemo(() => new Map(tarotCards.map((card) => [card.id, card])), []);
  useEffect(() => {
    void drawSessionRepository
      .getActiveDraft()
      .then(setDraft)
      .catch(() => setError('无法恢复上次桌面。'));
  }, []);
  const persist = (next: DrawSession) => {
    const current = ++version.current;
    setSession(next);
    setActiveDrawSession(next);
    setBusy(true);
    void drawSessionRepository
      .update(next.id, {
        cards: next.cards,
        configuration: next.configuration,
        spreadId: next.spreadId,
      })
      .then((saved) => {
        if (version.current === current) {
          setSession(saved);
          setActiveDrawSession(saved);
        }
      })
      .catch(() => setError('无法保存当前桌面；你的当前状态仍保留在屏幕上。'))
      .finally(() => {
        if (version.current === current) setBusy(false);
      });
  };
  const start = async () => {
    if (!question.trim() || busy) {
      setError('请先写下想探索的问题。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await drawSessionRepository.create({
        spreadId: 'free-table',
        cards: [],
        configuration: {
          ...DEFAULT_DRAW_CONFIGURATION,
          cardCount: 0,
          spreadId: 'free-table',
          spreadPositionIds: [],
          questionText: question.trim(),
          ritual: { stage: 'draw', drawnCount: 0, revealedPositionIndexes: [] },
        },
      });
      setSession(created);
      setActiveDrawSession(created);
      setDraft(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法开始抽牌。');
    } finally {
      setBusy(false);
    }
  };
  const draw = () => {
    if (!session || busy) return;
    const used = new Set(session.cards.map((card) => card.tarotCardId));
    const remaining = tarotCards.filter((card) => !used.has(card.id));
    const tarotCard = remaining[Math.floor(Math.random() * remaining.length)];
    if (!tarotCard) return;
    const reversed =
      session.configuration.reversalMode !== 'disabled' &&
      Math.random() < session.configuration.reversedProbability;
    const expression =
      reversed && session.configuration.reversalMode === 'expression'
        ? Math.random() < session.configuration.overexpressedProbabilityWhenReversed
          ? 'overexpressed'
          : 'underexpressed'
        : null;
    const index = session.cards.length;
    persist({
      ...session,
      cards: [
        ...session.cards,
        {
          id: `table-${index}`,
          tarotCardId: tarotCard.id,
          positionIndex: index,
          spreadPositionId: `free-table.${index + 1}`,
          positionSnapshot: `Card ${index + 1}`,
          orientation: reversed ? 'reversed' : 'upright',
          reversalExpression: expression,
          source: 'drawn',
          drawSessionId: session.id,
        },
      ],
      configuration: {
        ...session.configuration,
        cardCount: index + 1,
        spreadPositionIds: [...session.configuration.spreadPositionIds, `free-table.${index + 1}`],
        ritual: { ...ritualState(session), stage: 'draw', drawnCount: index + 1 },
      },
    });
  };
  if (!session)
    return (
      <Screen scroll>
        <Text variant="eyebrow">Free tarot table</Text>
        <Text variant="title">What would you like to explore today?</Text>
        {draft ? (
          <View style={styles.panel}>
            <Text>{draft.configuration.questionText ?? '未命名问题'}</Text>
            <Button
              label="继续桌面"
              onPress={() => {
                setSession(draft);
                setActiveDrawSession(draft);
                setDraft(null);
              }}
            />
            <Button
              label="丢弃草稿"
              onPress={() => void drawSessionRepository.delete(draft.id).then(() => setDraft(null))}
            />
          </View>
        ) : (
          <>
            <TextInput
              accessibilityLabel="探索的问题"
              value={question}
              onChangeText={setQuestion}
              multiline
              placeholder="写下你想探索的问题"
              style={styles.input}
            />
            <Button
              label={busy ? '正在开始…' : 'Continue'}
              disabled={busy}
              onPress={() => void start()}
            />
          </>
        )}
      </Screen>
    );
  const ritual = ritualState(session);
  const remaining = tarotCards.length - session.cards.length;
  return (
    <Screen scroll>
      <Text variant="eyebrow">Tarot Table</Text>
      <Text variant="title">{session.configuration.questionText}</Text>
      <RevealProgress
        revealed={ritual.revealedPositionIndexes.length}
        total={session.cards.length}
      />
      <View style={styles.table}>
        {session.cards.map((card, index) =>
          ritual.revealedPositionIndexes.includes(index) ? (
            <RevealCard
              key={card.id}
              revealed
              label={`Card ${index + 1}`}
              name={cardsById.get(card.tarotCardId)?.name_zh ?? '未知牌'}
              orientation={cardLabel(card)}
              onReveal={() => undefined}
            />
          ) : (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={`揭示第 ${index + 1} 张牌`}
              onPress={() => persist(revealCard(session, index))}
            >
              <FaceDownCard label={`Card ${index + 1}`} />
            </Pressable>
          ),
        )}
      </View>
      <View style={styles.toolbar}>
        <Button
          label={busy ? '处理中…' : 'Draw another card'}
          disabled={busy || remaining === 0}
          onPress={draw}
        />
        <Button
          label="Finish this session"
          disabled={session.cards.length === 0 || busy}
          onPress={() =>
            persist({
              ...session,
              configuration: {
                ...session.configuration,
                ritual: { ...ritual, stage: 'reflection' },
              },
            })
          }
        />
      </View>
      {ritual.stage === 'reflection' ? (
        <>
          <Text variant="muted">Take a moment to observe the cards.</Text>
          <Button
            label="Continue to Reading"
            onPress={() => {
              setActiveDrawSession(session);
              router.push({ pathname: '/readings/new', params: { drawSessionId: session.id } });
            }}
          />
        </>
      ) : null}
      <Text variant="muted">剩余 {remaining} 张</Text>
      <FlatList
        horizontal
        data={Array.from({ length: remaining }, (_, index) => index)}
        keyExtractor={(item) => String(item)}
        renderItem={() => (
          <View style={styles.deck}>
            <FaceDownCard label="可抽取牌" />
          </View>
        )}
        showsHorizontalScrollIndicator
        accessibilityLabel="可横向滚动的剩余牌堆"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  deck: { marginRight: -42 },
  error: { color: colors.danger },
  input: {
    borderColor: colors.border,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    minHeight: 100,
    padding: spacing.md,
  },
  panel: { gap: spacing.md },
  table: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, minHeight: 160 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
