import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { tarotCards } from '@/domain/tarotCards';
import { DeckView } from '@/features/draw/components/DeckView';
import { FaceDownCard } from '@/features/draw/components/FaceDownCard';
import { PrepareScreen } from '@/features/draw/components/PrepareScreen';
import { RevealCard } from '@/features/draw/components/RevealCard';
import { RevealProgress } from '@/features/draw/components/RevealProgress';
import {
  beginReveal,
  drawNextCard,
  revealCard,
  ritualState,
  startRitual,
} from '@/features/draw/drawRitual';
import { drawEngine } from '@/features/draw/drawEngine';
import { setActiveDrawSession } from '@/features/draw/drawSessionStore';
import {
  DEFAULT_DRAW_CONFIGURATION,
  type DrawSession,
  type ReversalMode,
} from '@/features/draw/drawTypes';
import { drawSessionRepository } from '@/repositories/repositoryFactory';
import { spreadRepository } from '@/features/spreads/spreadRepository';
import { borderRadii, colors, spacing } from '@/theme/tokens';

const modeLabels: Record<ReversalMode, string> = {
  disabled: '不使用逆位',
  standard: '普通逆位',
  expression: '逆位表达模式',
};
function orientation(card: DrawSession['cards'][number]) {
  if (card.orientation === 'upright') return '正位';
  if (card.reversalExpression === 'underexpressed') return '逆位 · 表达不足';
  if (card.reversalExpression === 'overexpressed') return '逆位 · 表达过度';
  return '逆位';
}

export default function DrawScreen() {
  const router = useRouter();
  const [spreadId, setSpreadId] = useState('single-card');
  const [reversalMode, setReversalMode] = useState<ReversalMode>('standard');
  const [question, setQuestion] = useState('');
  const [session, setSession] = useState<DrawSession | null>(null);
  const [draft, setDraft] = useState<DrawSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardsById = useMemo(() => new Map(tarotCards.map((card) => [card.id, card])), []);
  useEffect(() => {
    void drawSessionRepository
      .getActiveDraft()
      .then(setDraft)
      .catch(() => setError('无法加载上次抽牌。'));
  }, []);
  const publish = (next: DrawSession) => {
    setSession(next);
    setActiveDrawSession(next);
    void drawSessionRepository
      .update(next.id, {
        cards: next.cards,
        configuration: next.configuration,
        spreadId: next.spreadId,
      })
      .then(setSession)
      .catch(() => setError('无法保存抽牌草稿。'));
  };
  const create = async () => {
    try {
      const resolved = spreadRepository.resolveSpread(spreadId);
      const configuration = {
        ...DEFAULT_DRAW_CONFIGURATION,
        cardCount: resolved.positions.length,
        spreadId,
        spreadPositionIds: resolved.positions.map((p) => p.id),
        reversalMode,
        questionText: question,
        ritual: { stage: 'prepare' as const, drawnCount: 0, revealedPositionIndexes: [] },
      };
      const result = drawEngine.draw(tarotCards, configuration);
      const created = await drawSessionRepository.create({
        spreadId,
        configuration,
        cards: result.cards.map((card) => ({ ...card, drawSessionId: null })),
      });
      setSession(created);
      setActiveDrawSession(created);
      setDraft(null);
    } catch {
      setError('暂时无法完成抽牌。');
    }
  };
  if (!session)
    return (
      <Screen scroll>
        <Text variant="eyebrow">Intentional draw</Text>
        <Text variant="title">准备一次抽牌</Text>
        {draft ? (
          <View style={styles.card}>
            <Text>继续上次抽牌？</Text>
            <Button
              label="继续"
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
              accessibilityLabel="本次问题"
              value={question}
              onChangeText={setQuestion}
              placeholder="写下想探索的问题（可选）"
              style={styles.input}
            />
            {spreadRepository
              .listSpreads()
              .filter((item) => !item.isOpen)
              .map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSpreadId(item.id)}
                  style={[styles.option, item.id === spreadId && styles.selected]}
                >
                  <Text>{item.name}</Text>
                  <Text variant="muted">{item.description}</Text>
                </Pressable>
              ))}
            {(Object.keys(modeLabels) as ReversalMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setReversalMode(mode)}
                style={[styles.option, mode === reversalMode && styles.selected]}
              >
                <Text>{modeLabels[mode]}</Text>
              </Pressable>
            ))}
            <Button label="继续准备" onPress={() => void create()} />
          </>
        )}
        <Button label="抽牌历史" onPress={() => router.push('/draw/history' as never)} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  const ritual = ritualState(session);
  const resolved = spreadRepository.resolveSpread(session.configuration.spreadId);
  return (
    <Screen scroll>
      <Text variant="eyebrow">Intentional draw</Text>
      {ritual.stage === 'prepare' ? (
        <PrepareScreen
          question={session.configuration.questionText ?? ''}
          spread={resolved.name}
          count={session.cards.length}
          reversalMode={modeLabels[session.configuration.reversalMode]}
          onStart={() => publish(startRitual(session))}
        />
      ) : null}
      {ritual.stage === 'draw' ? (
        <>
          <Text variant="title">Draw one card at a time</Text>
          <DeckView remaining={session.cards.length - ritual.drawnCount} />
          <View style={styles.row}>
            {session.cards.map((card, index) =>
              ritual.drawnCount > index ? (
                <FaceDownCard
                  key={card.id}
                  label={resolved.positions[index]?.title ?? `Card ${index + 1}`}
                />
              ) : (
                <View key={card.id} style={styles.slot}>
                  <Text>{resolved.positions[index]?.title ?? `Card ${index + 1}`}</Text>
                </View>
              ),
            )}
          </View>
          <Button
            label={
              ritual.drawnCount === session.cards.length
                ? 'Begin Reveal'
                : `Draw Card ${ritual.drawnCount + 1}`
            }
            onPress={() =>
              publish(
                ritual.drawnCount === session.cards.length
                  ? beginReveal(session)
                  : drawNextCard(session),
              )
            }
          />
        </>
      ) : null}
      {ritual.stage === 'reveal' || ritual.stage === 'reflection' ? (
        <>
          <Text variant="title">Reveal at your own pace</Text>
          <RevealProgress
            revealed={ritual.revealedPositionIndexes.length}
            total={session.cards.length}
          />
          <View style={styles.row}>
            {session.cards.map((card, index) => (
              <RevealCard
                key={card.id}
                revealed={ritual.revealedPositionIndexes.includes(index)}
                label={resolved.positions[index]?.title ?? `Card ${index + 1}`}
                name={cardsById.get(card.tarotCardId)?.name_zh ?? '未知牌'}
                orientation={orientation(card)}
                onReveal={() => publish(revealCard(session, index))}
              />
            ))}
          </View>
          {ritual.stage === 'reflection' ? (
            <>
              <Text variant="muted">
                Take a moment to observe the cards.{`\n`}When ready, continue to your journal.
              </Text>
              <Button
                label="Continue to Reading"
                onPress={() => {
                  setActiveDrawSession(session);
                  router.push({ pathname: '/readings/new', params: { drawSessionId: session.id } });
                }}
              />
            </>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  error: { color: colors.danger },
  input: {
    borderColor: colors.border,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  option: {
    borderColor: colors.border,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  selected: { backgroundColor: colors.surface },
  slot: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: borderRadii.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 112,
    justifyContent: 'center',
    padding: spacing.xs,
    width: 74,
  },
});
