import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  type ViewStyle,
  View,
} from 'react-native';
import {
  TABLE_EDGE_SCROLL_INDICATOR_VISIBLE,
  centeredLoopOffset,
  deckGestureIntent,
  loopedDeckItems,
  recenteredLoopOffset,
  type LoopedDeckItem,
} from '../deckEdgeGestures';
import { FaceDownCard } from './FaceDownCard';

const CARD_STEP = 26;

export function TableEdge({
  cardIds,
  onSelect,
}: {
  cardIds: readonly number[];
  onSelect: (id: number) => void;
}) {
  const listRef = useRef<FlatList<LoopedDeckItem>>(null);
  const offset = useRef(0);
  const segmentWidthRef = useRef(0);
  const dragStartOffset = useRef(0);
  const suppressSelectionUntil = useRef(0);
  const [dragging, setDragging] = useState(false);
  const segmentWidth = cardIds.length * CARD_STEP;
  const deckItems = loopedDeckItems(cardIds);
  useEffect(() => {
    if (segmentWidth <= 0) return;
    const previousSegmentWidth = segmentWidthRef.current;
    const previousPosition = previousSegmentWidth > 0 ? offset.current % previousSegmentWidth : 0;
    segmentWidthRef.current = segmentWidth;
    const nextOffset = segmentWidth + Math.min(previousPosition, segmentWidth - CARD_STEP);
    offset.current = nextOffset;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ animated: false, offset: nextOffset });
    });
    return () => cancelAnimationFrame(frame);
  }, [segmentWidth]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Platform.OS === 'web' && deckGestureIntent(gesture.dx, gesture.dy) === 'drag',
        onPanResponderGrant: () => {
          dragStartOffset.current = offset.current;
          setDragging(true);
        },
        onPanResponderMove: (_, gesture) => {
          const nextOffset = centeredLoopOffset(
            dragStartOffset.current - gesture.dx,
            segmentWidthRef.current,
          );
          offset.current = nextOffset;
          listRef.current?.scrollToOffset({
            animated: false,
            offset: nextOffset,
          });
        },
        onPanResponderRelease: () => {
          suppressSelectionUntil.current = Date.now() + 120;
          setDragging(false);
        },
        onPanResponderTerminate: () => {
          suppressSelectionUntil.current = Date.now() + 120;
          setDragging(false);
        },
      }),
    [],
  );
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextOffset = event.nativeEvent.contentOffset.x;
    const recenteredOffset = recenteredLoopOffset(nextOffset, segmentWidthRef.current);
    offset.current = recenteredOffset;
    if (recenteredOffset !== nextOffset) {
      listRef.current?.scrollToOffset({ animated: false, offset: recenteredOffset });
    }
  };
  return (
    <View
      style={[
        styles.edge,
        Platform.OS === 'web'
          ? ({ cursor: dragging ? 'grabbing' : 'grab' } as unknown as ViewStyle)
          : null,
      ]}
      {...panResponder.panHandlers}
    >
      <FlatList
        ref={listRef}
        horizontal
        data={deckItems}
        keyExtractor={(item) => `${item.cycle}:${item.cardId}`}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select face-down card ${item.position + 1}`}
            onPress={() => {
              if (Date.now() >= suppressSelectionUntil.current) onSelect(item.cardId);
            }}
          >
            <View style={styles.card}>
              <FaceDownCard label="Face-down card" />
            </View>
          </Pressable>
        )}
        getItemLayout={(_, index) => ({ index, length: CARD_STEP, offset: CARD_STEP * index })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={TABLE_EDGE_SCROLL_INDICATOR_VISIBLE}
        contentContainerStyle={styles.deck}
        accessibilityLabel="Remaining face-down deck"
      />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { marginRight: -48 },
  deck: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  edge: {
    backgroundColor: '#102A24',
    borderTopColor: '#31594C',
    borderTopWidth: 1,
    height: 132,
    overflow: 'hidden',
    userSelect: 'none',
  },
});
