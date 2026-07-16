import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { MysticText as Text } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';
import type { WindowTableBounds } from '../tablePlacement';
import {
  IDENTITY_TABLE_VIEWPORT,
  pinchDistance,
  pinchFocalPoint,
  scaleFromPinch,
  type TableViewportTransform,
  viewportForPinch,
} from '../tableZoom';

const TableScaleContext = createContext(1);

export function useTarotTableScale(): number {
  return useContext(TableScaleContext);
}

export function TarotTableSurface({
  children,
  empty,
  onLayout,
  onViewportChange,
  onWindowBoundsChange,
}: PropsWithChildren<{
  empty: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  onViewportChange?: (viewport: TableViewportTransform) => void;
  onWindowBoundsChange?: (bounds: WindowTableBounds) => void;
}>) {
  const { theme } = useAppTheme();
  const surfaceRef = useRef<View>(null);
  const [viewport, setViewport] = useState(IDENTITY_TABLE_VIEWPORT);
  const viewportRef = useRef(IDENTITY_TABLE_VIEWPORT);
  const windowBoundsRef = useRef<WindowTableBounds | null>(null);
  const emptyRef = useRef(empty);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const pinchStartFocalPoint = useRef<{ x: number; y: number } | null>(null);
  const pinchStartViewport = useRef(IDENTITY_TABLE_VIEWPORT);
  const onViewportChangeRef = useRef(onViewportChange);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);
  useEffect(() => {
    emptyRef.current = empty;
    if (!empty) return;
    viewportRef.current = IDENTITY_TABLE_VIEWPORT;
    setViewport(IDENTITY_TABLE_VIEWPORT);
    onViewportChangeRef.current?.(IDENTITY_TABLE_VIEWPORT);
  }, [empty]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) =>
          !emptyRef.current && event.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponderCapture: (event) =>
          !emptyRef.current && event.nativeEvent.touches.length >= 2,
        onPanResponderGrant: (event) => {
          const points = event.nativeEvent.touches.map((touch) => ({
            x: touch.pageX,
            y: touch.pageY,
          }));
          const focalPoint = pinchFocalPoint(points);
          const bounds = windowBoundsRef.current;
          pinchStartDistance.current = pinchDistance(points);
          pinchStartScale.current = viewportRef.current.scale;
          pinchStartViewport.current = viewportRef.current;
          pinchStartFocalPoint.current =
            focalPoint && bounds
              ? { x: focalPoint.x - bounds.x, y: focalPoint.y - bounds.y }
              : null;
        },
        onPanResponderMove: (event) => {
          const initialDistance = pinchStartDistance.current;
          const initialFocalPoint = pinchStartFocalPoint.current;
          const bounds = windowBoundsRef.current;
          const points = event.nativeEvent.touches.map((touch) => ({
            x: touch.pageX,
            y: touch.pageY,
          }));
          const currentDistance = pinchDistance(points);
          const currentWindowFocalPoint = pinchFocalPoint(points);
          if (
            initialDistance === null ||
            initialFocalPoint === null ||
            currentDistance === null ||
            currentWindowFocalPoint === null ||
            bounds === null
          )
            return;
          const nextScale = scaleFromPinch(
            pinchStartScale.current,
            initialDistance,
            currentDistance,
          );
          const nextViewport = viewportForPinch(
            pinchStartViewport.current,
            initialFocalPoint,
            {
              x: currentWindowFocalPoint.x - bounds.x,
              y: currentWindowFocalPoint.y - bounds.y,
            },
            nextScale,
          );
          viewportRef.current = nextViewport;
          setViewport(nextViewport);
          onViewportChangeRef.current?.(nextViewport);
        },
        onPanResponderRelease: () => {
          pinchStartDistance.current = null;
          pinchStartFocalPoint.current = null;
        },
        onPanResponderTerminate: () => {
          pinchStartDistance.current = null;
          pinchStartFocalPoint.current = null;
        },
      }),
    [],
  );
  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout?.(event);
    surfaceRef.current?.measureInWindow((x, y, width, height) => {
      const bounds = { x, y, width, height };
      windowBoundsRef.current = bounds;
      onWindowBoundsChange?.(bounds);
    });
  };
  return (
    <View
      accessibilityLabel="Tarot table"
      accessibilityHint="Use two fingers to pinch and resize the cards on the table"
      onLayout={handleLayout}
      ref={surfaceRef}
      style={[
        styles.surface,
        {
          backgroundColor: theme.colors.backgroundMid,
          borderColor: theme.colors.glassBorder,
          borderRadius: theme.radii.lg,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {empty ? (
        <View style={styles.empty}>
          <Text variant="muted" style={styles.placeholder}>
            从下方牌河选择一张牌，轻触或拖到桌面。
          </Text>
        </View>
      ) : (
        <TableScaleContext.Provider value={viewport.scale}>
          <View
            style={[
              styles.cards,
              {
                transform: [
                  { translateX: viewport.translation.x },
                  { translateY: viewport.translation.y },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.cards,
                {
                  transform: [{ scale: viewport.scale }],
                  transformOrigin: [viewport.origin.x, viewport.origin.y, 0],
                },
              ]}
            >
              {children}
            </View>
          </View>
        </TableScaleContext.Provider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: {
    ...StyleSheet.absoluteFillObject,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  placeholder: {
    textAlign: 'center',
  },
  surface: {
    borderWidth: 1,
    flex: 1,
    minHeight: 360,
    overflow: 'hidden',
  },
});
