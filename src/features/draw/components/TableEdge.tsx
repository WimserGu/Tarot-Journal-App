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
  deckCardGestureIntent,
  deckGestureIntent,
  loopedDeckItems,
  recenteredLoopOffset,
  type LoopedDeckItem,
} from '../deckEdgeGestures';
import { FaceDownCard } from './FaceDownCard';
import { useAppTheme } from '@/theme/useAppTheme';

const CARD_STEP = 26;

export function TableEdge({
  cardIds,
  onDrop,
  onSelect,
}: {
  cardIds: readonly number[];
  onDrop?: (id: number, point: { x: number; y: number }) => void;
  onSelect: (id: number) => void;
}) {
  const { theme } = useAppTheme();
  const listRef = useRef<FlatList<LoopedDeckItem>>(null);
  const containerRef = useRef<View>(null);
  const containerWindowOrigin = useRef({ x: 0, y: 0 });
  const offset = useRef(0);
  const segmentWidthRef = useRef(0);
  const dragStartOffset = useRef(0);
  const suppressSelectionUntil = useRef(0);
  const pendingCardId = useRef<number | null>(null);
  const draggedCardId = useRef<number | null>(null);
  const onDropRef = useRef(onDrop);
  const [dragging, setDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    cardId: number;
    x: number;
    y: number;
  } | null>(null);
  const segmentWidth = cardIds.length * CARD_STEP;
  const deckItems = loopedDeckItems(cardIds);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);
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
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          if (draggedCardId.current !== null) return true;
          if (
            pendingCardId.current !== null &&
            deckCardGestureIntent(gesture.dx, gesture.dy) === 'table-drag'
          ) {
            draggedCardId.current = pendingCardId.current;
            suppressSelectionUntil.current = Number.POSITIVE_INFINITY;
            setDragPreview({
              cardId: pendingCardId.current,
              x: gesture.moveX - containerWindowOrigin.current.x,
              y: gesture.moveY - containerWindowOrigin.current.y,
            });
            return true;
          }
          if (
            pendingCardId.current !== null &&
            deckCardGestureIntent(gesture.dx, gesture.dy) === 'scroll'
          ) {
            setDragPreview(null);
          }
          return Platform.OS === 'web' && deckGestureIntent(gesture.dx, gesture.dy) === 'drag';
        },
        onPanResponderGrant: () => {
          if (draggedCardId.current !== null) return;
          dragStartOffset.current = offset.current;
          setDragging(true);
        },
        onPanResponderMove: (_, gesture) => {
          if (draggedCardId.current !== null) {
            setDragPreview({
              cardId: draggedCardId.current,
              x: gesture.moveX - containerWindowOrigin.current.x,
              y: gesture.moveY - containerWindowOrigin.current.y,
            });
            return;
          }
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
        onPanResponderRelease: (_, gesture) => {
          const cardId = draggedCardId.current;
          if (cardId !== null) {
            onDropRef.current?.(cardId, { x: gesture.moveX, y: gesture.moveY });
            draggedCardId.current = null;
            pendingCardId.current = null;
            setDragPreview(null);
          }
          suppressSelectionUntil.current = Date.now() + 120;
          setDragging(false);
        },
        onPanResponderTerminate: () => {
          draggedCardId.current = null;
          pendingCardId.current = null;
          setDragPreview(null);
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
  const prepareCardPickup = (cardId: number) => {
    pendingCardId.current = cardId;
  };
  const clearCardPickupPreview = () => {
    setDragPreview(null);
  };
  const cancelStationaryCardDrag = () => {
    if (draggedCardId.current === null) return false;
    draggedCardId.current = null;
    pendingCardId.current = null;
    setDragPreview(null);
    suppressSelectionUntil.current = Date.now() + 120;
    return true;
  };
  return (
    <View
      onLayout={() =>
        containerRef.current?.measureInWindow((x, y) => {
          containerWindowOrigin.current = { x, y };
        })
      }
      ref={containerRef}
      style={styles.container}
    >
      <View
        style={[
          styles.edge,
          {
            backgroundColor: theme.colors.backgroundDeep,
            borderTopColor: theme.colors.glassBorder,
          },
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
              accessibilityHint="Tap to select, or drag this card upward onto the table"
              onPressIn={() => prepareCardPickup(item.cardId)}
              onPressOut={() => {
                if (draggedCardId.current === null) {
                  pendingCardId.current = null;
                  clearCardPickupPreview();
                }
              }}
              onPress={() => {
                if (cancelStationaryCardDrag()) return;
                pendingCardId.current = null;
                clearCardPickupPreview();
                if (Date.now() >= suppressSelectionUntil.current) onSelect(item.cardId);
              }}
            >
              <View style={styles.card}>
                <FaceDownCard label="Face-down card" />
              </View>
            </Pressable>
          )}
          getItemLayout={(_, index) => ({
            index,
            length: CARD_STEP,
            offset: CARD_STEP * index,
          })}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={TABLE_EDGE_SCROLL_INDICATOR_VISIBLE}
          contentContainerStyle={styles.deck}
          accessibilityLabel="Remaining face-down deck"
        />
      </View>
      {dragPreview ? (
        <View
          pointerEvents="none"
          style={[styles.dragPreview, { left: dragPreview.x - 37, top: dragPreview.y - 64 }]}
        >
          <FaceDownCard label="Dragged face-down card" />
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { marginRight: -48 },
  container: {
    height: 132,
    overflow: 'visible',
    zIndex: 1000,
  },
  deck: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  dragPreview: {
    elevation: 20,
    opacity: 0.92,
    position: 'absolute',
    zIndex: 1001,
  },
  edge: {
    borderTopWidth: 1,
    height: 132,
    overflow: 'hidden',
    userSelect: 'none',
  },
});
