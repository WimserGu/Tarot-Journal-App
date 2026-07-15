import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { tarotCards } from '@/domain/tarotCards';
import { DrawToolbar } from '@/features/draw/components/DrawToolbar';
import {
  CardArtworkPreloader,
  CARD_TABLE_HEIGHT,
  CARD_TABLE_WIDTH,
} from '@/features/draw/components/CardArtwork';
import { DraggableTableCard } from '@/features/draw/components/DraggableTableCard';
import { FaceDownCard } from '@/features/draw/components/FaceDownCard';
import { FocusCardModal } from '@/features/draw/components/FocusCardModal';
import { ObservationOverlay } from '@/features/draw/components/ObservationOverlay';
import { RevealCard } from '@/features/draw/components/RevealCard';
import { RevealProgress } from '@/features/draw/components/RevealProgress';
import { TableEdge } from '@/features/draw/components/TableEdge';
import { TarotTableSurface } from '@/features/draw/components/TarotTableSurface';
import { createHiddenDeck, remainingHiddenDeck } from '@/features/draw/hiddenDeck';
import { drawModeForSession, drawRouteForSession } from '@/features/draw/drawModeRoutes';
import { createLatestDrawSessionWriteQueue } from '@/features/draw/drawSessionWriteQueue';
import {
  FREE_TABLE_REVERSAL_OPTIONS,
  resolveFreeTableReversal,
  reversalModeForDraw,
} from '@/features/draw/freeTableReversal';
import { reversalAccessibilityLabel } from '@/features/draw/reversalPresentation';
import {
  revealCard,
  ritualState,
  setCardNote,
  setObservationMode,
} from '@/features/draw/drawRitual';
import { setActiveDrawSession } from '@/features/draw/drawSessionStore';
import {
  DEFAULT_DRAW_CONFIGURATION,
  type DrawSession,
  type NormalizedTablePlacement,
  type ReversalMode,
} from '@/features/draw/drawTypes';
import {
  nextTableZIndex,
  placementFromWindowDrop,
  tablePlacementKey,
  tableStateForSession,
  type WindowTableBounds,
  updateTablePlacement,
  withInitialTablePlacement,
} from '@/features/draw/tablePlacement';
import { drawSessionRepository } from '@/repositories/repositoryFactory';
import { spreadRepository } from '@/features/spreads/spreadRepository';
import { preloadTarotCardFront } from '@/features/tarot/artwork/tarotArtworkPreload';
import { borderRadii, colors, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function DrawScreen({ initialMode }: { initialMode?: 'table' | 'single' | 'three' } = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string | string[];
    questionText?: string | string[];
    topicId?: string | string[];
    questionTemplateId?: string | string[];
  }>();
  const [question, setQuestion] = useState(() => firstRouteParam(params.questionText) ?? '');
  const [reversalMode, setReversalMode] = useState<ReversalMode>(
    DEFAULT_DRAW_CONFIGURATION.reversalMode,
  );
  const [session, setSession] = useState<DrawSession | null>(null);
  const [draft, setDraft] = useState<DrawSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [tableBounds, setTableBounds] = useState({ width: 0, height: 0 });
  const [windowTableBounds, setWindowTableBounds] = useState<WindowTableBounds | null>(null);
  const version = useRef(0);
  const sessionRef = useRef<DrawSession | null>(null);
  const writeQueue = useMemo(
    () =>
      createLatestDrawSessionWriteQueue((next) =>
        drawSessionRepository.update(next.id, {
          cards: next.cards,
          configuration: next.configuration,
          spreadId: next.spreadId,
        }),
      ),
    [],
  );
  const cardsById = useMemo(() => new Map(tarotCards.map((card) => [card.id, card])), []);
  const mode = initialMode ?? firstRouteParam(params.mode);
  const modeTitle = mode === 'single' ? '单张牌阵' : mode === 'three' ? '三张牌阵' : '自由牌桌';
  const draftMode = draft ? drawModeForSession(draft) : null;
  const draftRoute = draft ? drawRouteForSession(draft) : '/draw/table';
  const chooseMode = (route: '/draw/table' | '/draw/single' | '/draw/three-card') => {
    if (!draft) {
      router.push(route);
      return;
    }
    const selectedMatchesDraft =
      (route === '/draw/table' && draftMode === 'free-table') ||
      (route === '/draw/single' && draftMode === 'single-card') ||
      (route === '/draw/three-card' && draftMode === 'three-cards');
    if (selectedMatchesDraft) {
      router.push(route);
      return;
    }
    Alert.alert(
      '已有抽牌草稿',
      '一次只能保留一个抽牌草稿。你可以继续现有草稿，或删除后开始新的模式。',
      [
        { text: '取消', style: 'cancel' },
        { text: '继续现有草稿', onPress: () => router.push(draftRoute as never) },
        {
          text: '删除并开始',
          style: 'destructive',
          onPress: () =>
            void drawSessionRepository.delete(draft.id).then(() => {
              setDraft(null);
              router.push(route);
            }),
        },
      ],
    );
  };
  useEffect(() => {
    void drawSessionRepository
      .getActiveDraft()
      .then(setDraft)
      .catch(() => setError('Unable to restore table.'));
  }, []);
  useEffect(() => {
    session?.cards.forEach((card) => {
      void preloadTarotCardFront(card.tarotCardId);
    });
  }, [session]);
  const persist = (next: DrawSession) => {
    const current = ++version.current;
    sessionRef.current = next;
    setSession(next);
    setActiveDrawSession(next);
    void writeQueue
      .enqueue(next)
      .then((saved) => {
        if (version.current === current) {
          sessionRef.current = saved;
          setActiveDrawSession(saved);
          setError(null);
        }
      })
      .catch(() => {
        if (version.current === current) {
          setError('Unable to save the table; the current view remains available.');
        }
      });
  };
  const start = async () => {
    if (!question.trim() || busy) {
      setError('Enter a question first.');
      return;
    }
    setBusy(true);
    try {
      const spreadId = mode === 'single' ? 'single-card' : mode === 'three' ? 'three-cards' : null;
      const spread = spreadId ? spreadRepository.resolveSpread(spreadId) : null;
      const created = await drawSessionRepository.create({
        spreadId,
        cards: [],
        configuration: {
          ...DEFAULT_DRAW_CONFIGURATION,
          cardCount: 0,
          spreadId: spreadId ?? 'free-table',
          spreadPositionIds: spread?.positions.map((position) => position.id) ?? [],
          reversalMode: reversalModeForDraw(mode, reversalMode),
          questionText: question.trim(),
          sourceTopicId: firstRouteParam(params.topicId),
          sourceQuestionTemplateId: firstRouteParam(params.questionTemplateId),
          hiddenDeckCardIds: createHiddenDeck(tarotCards),
          ritual: { stage: 'draw', drawnCount: 0, revealedPositionIndexes: [], cardNotes: {} },
        },
      });
      sessionRef.current = created;
      setSession(created);
      setActiveDrawSession(created);
      setDraft(null);
    } catch {
      setError('Unable to start the table.');
    } finally {
      setBusy(false);
    }
  };
  const selectFromDeck = (tarotCardId: number, initialPlacement?: NormalizedTablePlacement) => {
    const currentSession = sessionRef.current ?? session;
    if (!currentSession) return;
    if (currentSession.cards.some((card) => card.tarotCardId === tarotCardId)) return;
    const { orientation, reversalVariant } = resolveFreeTableReversal(currentSession.configuration);
    const index = currentSession.cards.length;
    const maximumCards =
      currentSession.configuration.spreadId === 'single-card'
        ? 1
        : currentSession.configuration.spreadId === 'three-cards'
          ? 3
          : Number.POSITIVE_INFINITY;
    if (index >= maximumCards) return;
    void preloadTarotCardFront(tarotCardId);
    const spreadPositionId =
      currentSession.configuration.spreadPositionIds[index] ?? `free-table.${index + 1}`;
    const ritual = ritualState(currentSession);
    const cardId = `table-${index}`;
    const configurationWithPlacement = withInitialTablePlacement(
      currentSession.configuration,
      `position:${index}`,
      index,
      initialPlacement,
    );
    persist({
      ...currentSession,
      cards: [
        ...currentSession.cards,
        {
          id: cardId,
          tarotCardId,
          positionIndex: index,
          spreadPositionId,
          positionSnapshot:
            currentSession.configuration.spreadId === 'free-table'
              ? `Card ${index + 1}`
              : (spreadRepository.getSpread(currentSession.configuration.spreadId)?.positions[index]
                  ?.title ?? `Card ${index + 1}`),
          orientation,
          reversalVariant,
          source: 'drawn',
          drawSessionId: currentSession.id,
        },
      ],
      configuration: {
        ...configurationWithPlacement,
        cardCount: index + 1,
        spreadPositionIds:
          currentSession.configuration.spreadId === 'free-table'
            ? [...currentSession.configuration.spreadPositionIds, spreadPositionId]
            : currentSession.configuration.spreadPositionIds,
        ritual: { ...ritual, stage: 'draw', drawnCount: index + 1 },
      },
    });
  };
  if (!['table', 'single', 'three'].includes(mode ?? ''))
    return (
      <Screen scroll>
        <Text variant="eyebrow">即时抽牌</Text>
        <Text variant="title">选择抽牌方式</Text>
        <Text variant="muted">四种方式并列展示；只有你主动选择后才会进入对应流程。</Text>
        <View style={styles.choiceCard}>
          <Text variant="subtitle">自由牌桌</Text>
          <Text variant="muted">不预设数量和位置，从底部牌河自由选择并决定何时结束。</Text>
          <Text variant="muted">状态：可用</Text>
          <Button
            label={draftMode === 'free-table' ? '继续' : '开始'}
            onPress={() => chooseMode('/draw/table')}
          />
        </View>
        <View style={styles.choiceCard}>
          <Text variant="subtitle">单张牌阵</Text>
          <Text variant="muted">使用现有 Single Card Spread，固定选择 1 张牌。</Text>
          <Text variant="muted">状态：可用</Text>
          <Button
            label={draftMode === 'single-card' ? '继续' : '开始'}
            onPress={() => chooseMode('/draw/single')}
          />
        </View>
        <View style={styles.choiceCard}>
          <Text variant="subtitle">三张牌阵</Text>
          <Text variant="muted">固定选择 3 张牌，使用 Past、Present、Future 位置定义。</Text>
          <Text variant="muted">状态：可用</Text>
          <Button
            label={draftMode === 'three-cards' ? '继续' : '开始'}
            onPress={() => chooseMode('/draw/three-card')}
          />
        </View>
        <View style={styles.choiceCard}>
          <Text variant="subtitle">自定义牌阵</Text>
          <Text variant="muted">自定义位置编辑器尚未实现。</Text>
          <Text variant="muted">状态：即将开放</Text>
          <Button label="查看状态" onPress={() => router.push('/draw/custom')} />
        </View>
        <View style={styles.secondaryActions}>
          <Text variant="subtitle">其他</Text>
          <Button label="抽牌历史" onPress={() => router.push('/draw/history' as never)} />
        </View>
      </Screen>
    );
  if (!session)
    return (
      <Screen scroll>
        <Text variant="eyebrow">{modeTitle}</Text>
        <Text variant="title">What would you like to explore today?</Text>
        {draft ? (
          <View style={styles.panel}>
            <Text>{draft.configuration.questionText ?? 'Untitled question'}</Text>
            <Button
              label="Resume table"
              onPress={() => {
                sessionRef.current = draft;
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
            <View style={styles.reversalSection}>
              <Text variant="subtitle">逆位设置</Text>
              {FREE_TABLE_REVERSAL_OPTIONS.map((option) => {
                const selected = reversalMode === option.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option.value}
                    onPress={() => setReversalMode(option.value)}
                    style={[styles.reversalOption, selected ? styles.reversalOptionSelected : null]}
                  >
                    <View style={styles.reversalOptionHeader}>
                      <Text variant="subtitle">{option.label}</Text>
                      {selected ? <Text variant="muted">已选择</Text> : null}
                    </View>
                    <Text variant="muted">{option.description}</Text>
                  </Pressable>
                );
              })}
            </View>
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
  const remainingDeck = session.configuration.hiddenDeckCardIds
    ? remainingHiddenDeck(session)
    : tarotCards
        .map((card) => card.id)
        .filter((id) => !session.cards.some((card) => card.tarotCardId === id));
  const maximumCards =
    session.configuration.spreadId === 'single-card'
      ? 1
      : session.configuration.spreadId === 'three-cards'
        ? 3
        : Number.POSITIVE_INFINITY;
  const canSelectMore = session.cards.length < maximumCards;
  const canFinish =
    session.configuration.spreadId === 'free-table'
      ? session.cards.length > 0
      : session.cards.length === maximumCards;
  const positionTitle = (index: number) =>
    session.configuration.spreadId === 'free-table'
      ? `Card ${index + 1}`
      : (spreadRepository.getSpread(session.configuration.spreadId)?.positions[index]?.title ??
        `Card ${index + 1}`);
  const focused = session.cards.find((card) => card.id === focusedId) ?? null;
  const tableState = tableStateForSession(session);
  const dragZIndex = nextTableZIndex(tableState);
  return (
    <SafeAreaView style={styles.tableScreen}>
      <CardArtworkPreloader cardIds={session.cards.map((card) => card.tarotCardId)} />
      <View style={styles.questionArea}>
        <Text variant="title" style={styles.question}>
          {session.configuration.questionText}
        </Text>
        <RevealProgress
          inverted
          revealed={ritual.revealedPositionIndexes.length}
          total={session.cards.length}
        />
      </View>
      <TarotTableSurface
        empty={session.cards.length === 0}
        onLayout={(event) => setTableBounds(event.nativeEvent.layout)}
        onWindowBoundsChange={setWindowTableBounds}
      >
        {session.cards.map((card, index) => {
          const revealed = ritual.revealedPositionIndexes.includes(index);
          const cardName = cardsById.get(card.tarotCardId)?.name_zh ?? 'Unknown';
          const placement = tableState.placementsByCardId[tablePlacementKey(card)];
          if (!placement) return null;
          return (
            <DraggableTableCard
              accessibilityLabel={
                revealed
                  ? `${cardName}，${reversalAccessibilityLabel(card.orientation, card.reversalVariant)}，双击查看详情`
                  : '桌面上的未揭示牌，双击揭示'
              }
              cardBounds={{ width: CARD_TABLE_WIDTH, height: CARD_TABLE_HEIGHT }}
              disabled={tableBounds.width === 0 || tableBounds.height === 0}
              dragZIndex={dragZIndex}
              key={card.id}
              onDragEnd={(nextPlacement) =>
                persist(updateTablePlacement(session, card.id, nextPlacement))
              }
              onTap={() => (revealed ? setFocusedId(card.id) : persist(revealCard(session, index)))}
              placement={placement}
              tableBounds={tableBounds}
            >
              {revealed ? (
                <RevealCard
                  revealed
                  label={positionTitle(index)}
                  cardId={card.tarotCardId}
                  name={cardName}
                  orientation={card.orientation}
                  reversalVariant={card.reversalVariant}
                />
              ) : (
                <FaceDownCard label={positionTitle(index)} size="table" />
              )}
            </DraggableTableCard>
          );
        })}
      </TarotTableSurface>
      {canSelectMore ? (
        <TableEdge
          cardIds={remainingDeck}
          onDrop={(tarotCardId, point) => {
            if (!windowTableBounds) return;
            const placement = placementFromWindowDrop(
              point,
              windowTableBounds,
              { width: CARD_TABLE_WIDTH, height: CARD_TABLE_HEIGHT },
              dragZIndex,
            );
            if (placement) selectFromDeck(tarotCardId, placement);
          }}
          onSelect={selectFromDeck}
        />
      ) : (
        <View style={styles.closedDeckEdge}>
          <Text style={styles.tableMessage}>此牌阵的牌已全部选完，你仍可按任意顺序揭示。</Text>
        </View>
      )}
      {!ritual.isObserving ? (
        <DrawToolbar
          disabled={false}
          canFinish={canFinish}
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
        <View style={styles.reflectionAction}>
          <Button
            label="Begin Reflection"
            onPress={() => {
              setActiveDrawSession(session);
              router.push({ pathname: '/readings/new', params: { drawSessionId: session.id } });
            }}
          />
        </View>
      ) : null}
      {ritual.isObserving ? (
        <ObservationOverlay onDismiss={() => persist(setObservationMode(session, false))} />
      ) : null}
      {focused ? (
        <FocusCardModal
          visible
          title={positionTitle(focused.positionIndex)}
          cardId={focused.tarotCardId}
          name={cardsById.get(focused.tarotCardId)?.name_zh ?? 'Unknown'}
          englishName={cardsById.get(focused.tarotCardId)?.name_en}
          orientation={focused.orientation}
          reversalVariant={focused.reversalVariant}
          note={ritual.cardNotes?.[focused.id] ?? ''}
          onNoteChange={(note) => persist(setCardNote(session, focused.id, note))}
          onDismiss={() => setFocusedId(null)}
        />
      ) : null}
      {error ? <Text style={styles.tableError}>{error}</Text> : null}
    </SafeAreaView>
  );
}

export default function DrawModeSelectionScreen() {
  return <DrawScreen />;
}
const styles = StyleSheet.create({
  choiceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  error: { color: colors.danger },
  input: {
    borderColor: colors.border,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    minHeight: 100,
    padding: spacing.md,
  },
  panel: { gap: spacing.md },
  reversalOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  reversalOptionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reversalOptionSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  reversalSection: { gap: spacing.sm },
  secondaryActions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  closedDeckEdge: {
    alignItems: 'center',
    backgroundColor: '#102A24',
    borderTopColor: '#31594C',
    borderTopWidth: 1,
    justifyContent: 'center',
    minHeight: 72,
    padding: spacing.md,
  },
  question: { color: '#F2F6F4', textAlign: 'center' },
  questionArea: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reflectionAction: {
    alignItems: 'center',
    backgroundColor: '#102A24',
    paddingBottom: spacing.sm,
  },
  tableError: {
    backgroundColor: '#102A24',
    color: '#FFB8B8',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  tableMessage: { color: '#B9CBC4', textAlign: 'center' },
  tableScreen: {
    backgroundColor: '#102A24',
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
});
