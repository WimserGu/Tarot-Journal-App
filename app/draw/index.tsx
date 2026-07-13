import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { tarotCards } from '@/domain/tarotCards';
import { DeckCounter } from '@/features/draw/components/DeckCounter';
import { DrawToolbar } from '@/features/draw/components/DrawToolbar';
import { FaceDownCard } from '@/features/draw/components/FaceDownCard';
import { FocusCardModal } from '@/features/draw/components/FocusCardModal';
import { ObservationOverlay } from '@/features/draw/components/ObservationOverlay';
import { RevealCard } from '@/features/draw/components/RevealCard';
import { RevealProgress } from '@/features/draw/components/RevealProgress';
import {
  revealCard,
  ritualState,
  setCardNote,
  setObservationMode,
} from '@/features/draw/drawRitual';
import { setActiveDrawSession } from '@/features/draw/drawSessionStore';
import { DEFAULT_DRAW_CONFIGURATION, type DrawSession } from '@/features/draw/drawTypes';
import { drawSessionRepository } from '@/repositories/repositoryFactory';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function orientation(card: DrawSession['cards'][number]) {
  return card.orientation === 'upright'
    ? 'Upright'
    : card.reversalExpression === 'underexpressed'
      ? 'Reversed · underexpressed'
      : card.reversalExpression === 'overexpressed'
        ? 'Reversed · overexpressed'
        : 'Reversed';
}
export default function DrawScreen() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [session, setSession] = useState<DrawSession | null>(null);
  const [draft, setDraft] = useState<DrawSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const version = useRef(0);
  const cardsById = useMemo(() => new Map(tarotCards.map((card) => [card.id, card])), []);
  useEffect(() => {
    void drawSessionRepository
      .getActiveDraft()
      .then(setDraft)
      .catch(() => setError('Unable to restore table.'));
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
      .catch(() => setError('Unable to save the table; the current view remains available.'))
      .finally(() => {
        if (version.current === current) setBusy(false);
      });
  };
  const start = async () => {
    if (!question.trim() || busy) {
      setError('Enter a question first.');
      return;
    }
    setBusy(true);
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
          ritual: { stage: 'draw', drawnCount: 0, revealedPositionIndexes: [], cardNotes: {} },
        },
      });
      setSession(created);
      setActiveDrawSession(created);
      setDraft(null);
    } catch {
      setError('Unable to start the table.');
    } finally {
      setBusy(false);
    }
  };
  const draw = () => {
    if (!session || busy) return;
    const used = new Set(session.cards.map((card) => card.tarotCardId));
    const remainingCards = tarotCards.filter((card) => !used.has(card.id));
    const tarotCard = remainingCards[Math.floor(Math.random() * remainingCards.length)];
    if (!tarotCard) return;
    const reversed =
      session.configuration.reversalMode !== 'disabled' &&
      Math.random() < session.configuration.reversedProbability;
    const index = session.cards.length;
    const ritual = ritualState(session);
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
          reversalExpression: null,
          source: 'drawn',
          drawSessionId: session.id,
        },
      ],
      configuration: {
        ...session.configuration,
        cardCount: index + 1,
        spreadPositionIds: [...session.configuration.spreadPositionIds, `free-table.${index + 1}`],
        ritual: { ...ritual, stage: 'draw', drawnCount: index + 1 },
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
            <Text>{draft.configuration.questionText ?? 'Untitled question'}</Text>
            <Button
              label="Resume table"
              onPress={() => {
                setSession(draft);
                setActiveDrawSession(draft);
                setDraft(null);
              }}
            />
            <Button
              label="Discard draft"
              onPress={() => void drawSessionRepository.delete(draft.id).then(() => setDraft(null))}
            />
          </View>
        ) : (
          <>
            <TextInput
              accessibilityLabel="Question"
              value={question}
              onChangeText={setQuestion}
              multiline
              placeholder="Write your question"
              style={styles.input}
            />
            <Button
              label={busy ? 'Starting…' : 'Continue'}
              disabled={busy}
              onPress={() => void start()}
            />
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  const ritual = ritualState(session);
  const remaining = tarotCards.length - session.cards.length;
  const focused = session.cards.find((card) => card.id === focusedId) ?? null;
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
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={`View card ${index + 1}`}
              onPress={() => setFocusedId(card.id)}
            >
              <RevealCard
                revealed
                label={`Card ${index + 1}`}
                name={cardsById.get(card.tarotCardId)?.name_zh ?? 'Unknown'}
                orientation={orientation(card)}
                onReveal={() => undefined}
              />
            </Pressable>
          ) : (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={`Reveal card ${index + 1}`}
              onPress={() => persist(revealCard(session, index))}
            >
              <FaceDownCard label={`Card ${index + 1}`} />
            </Pressable>
          ),
        )}
      </View>
      {!ritual.isObserving ? (
        <DrawToolbar
          disabled={busy || remaining === 0}
          canFinish={session.cards.length > 0}
          onDraw={draw}
          onFinish={() =>
            persist({
              ...session,
              configuration: {
                ...session.configuration,
                ritual: { ...ritual, stage: 'reflection' },
              },
            })
          }
          onObserve={() => persist(setObservationMode(session, true))}
          onHistory={() => router.push('/draw/history' as never)}
        />
      ) : null}
      {ritual.stage === 'reflection' ? (
        <Button
          label="Continue to Reading"
          onPress={() => {
            setActiveDrawSession(session);
            router.push({ pathname: '/readings/new', params: { drawSessionId: session.id } });
          }}
        />
      ) : null}
      <DeckCounter remaining={remaining} />
      <FlatList
        horizontal
        data={Array.from({ length: remaining }, (_, index) => index)}
        keyExtractor={String}
        renderItem={() => (
          <View style={styles.deck}>
            <FaceDownCard label="Available card" />
          </View>
        )}
        accessibilityLabel="Remaining deck"
      />
      {ritual.isObserving ? (
        <ObservationOverlay onDismiss={() => persist(setObservationMode(session, false))} />
      ) : null}
      {focused ? (
        <FocusCardModal
          visible
          title={`Card ${focused.positionIndex + 1}`}
          name={cardsById.get(focused.tarotCardId)?.name_zh ?? 'Unknown'}
          orientation={orientation(focused)}
          note={ritual.cardNotes?.[focused.id] ?? ''}
          onNoteChange={(note) => persist(setCardNote(session, focused.id, note))}
          onDismiss={() => setFocusedId(null)}
        />
      ) : null}
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
});
