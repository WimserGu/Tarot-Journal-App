import { PropsWithChildren, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { deckGestureIntent } from '../deckEdgeGestures';
import {
  pixelPlacement,
  placementFromPixels,
  type CardBounds,
  type TableBounds,
} from '../tablePlacement';
import type { NormalizedTablePlacement } from '../drawTypes';

export function DraggableTableCard({
  accessibilityLabel,
  cardBounds,
  children,
  disabled,
  dragZIndex,
  onDragEnd,
  onTap,
  placement,
  tableBounds,
}: PropsWithChildren<{
  accessibilityLabel: string;
  cardBounds: CardBounds;
  disabled: boolean;
  dragZIndex: number;
  onDragEnd: (placement: NormalizedTablePlacement) => void;
  onTap: () => void;
  placement: NormalizedTablePlacement;
  tableBounds: TableBounds;
}>) {
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const suppressTapUntil = useRef(0);
  const origin = pixelPlacement(placement, tableBounds, cardBounds);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && deckGestureIntent(gesture.dx, gesture.dy) === 'drag',
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          !disabled && deckGestureIntent(gesture.dx, gesture.dy) === 'drag',
        onPanResponderGrant: () => setDragging(true),
        onPanResponderMove: (_, gesture) => setDragDelta({ x: gesture.dx, y: gesture.dy }),
        onPanResponderRelease: (_, gesture) => {
          suppressTapUntil.current = Date.now() + 150;
          setDragging(false);
          setDragDelta({ x: 0, y: 0 });
          onDragEnd(
            placementFromPixels(
              origin.left + gesture.dx,
              origin.top + gesture.dy,
              tableBounds,
              cardBounds,
              dragZIndex,
            ),
          );
        },
        onPanResponderTerminate: () => {
          suppressTapUntil.current = Date.now() + 150;
          setDragging(false);
          setDragDelta({ x: 0, y: 0 });
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [cardBounds, disabled, dragZIndex, onDragEnd, origin.left, origin.top, tableBounds],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          height: cardBounds.height,
          left: origin.left + dragDelta.x,
          top: origin.top + dragDelta.y,
          width: cardBounds.width,
          zIndex: dragging ? dragZIndex : placement.zIndex,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          if (Date.now() >= suppressTapUntil.current) onTap();
        }}
        style={styles.pressable}
      >
        {children}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    userSelect: 'none',
  },
  pressable: {
    flex: 1,
  },
});
