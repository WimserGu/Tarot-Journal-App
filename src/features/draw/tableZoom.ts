import type { WindowPoint, WindowTableBounds } from './tablePlacement';

export const MIN_TABLE_SCALE = 0.75;
export const MAX_TABLE_SCALE = 1.6;

export type TableViewportTransform = {
  scale: number;
  origin: WindowPoint;
  translation: WindowPoint;
};

export const IDENTITY_TABLE_VIEWPORT: TableViewportTransform = {
  scale: 1,
  origin: { x: 0, y: 0 },
  translation: { x: 0, y: 0 },
};

export function clampTableScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(MIN_TABLE_SCALE, Math.min(MAX_TABLE_SCALE, value));
}

export function pinchDistance(points: readonly WindowPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0]!;
  const second = points[1]!;
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function pinchFocalPoint(points: readonly WindowPoint[]): WindowPoint | null {
  if (points.length < 2) return null;
  const first = points[0]!;
  const second = points[1]!;
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export function scaleFromPinch(
  initialScale: number,
  initialDistance: number,
  currentDistance: number,
): number {
  if (initialDistance <= 0 || currentDistance <= 0) return clampTableScale(initialScale);
  return clampTableScale(initialScale * (currentDistance / initialDistance));
}

export function pointInUnscaledViewport(
  point: WindowPoint,
  viewport: TableViewportTransform,
): WindowPoint {
  const safeScale = clampTableScale(viewport.scale);
  return {
    x: viewport.origin.x + (point.x - viewport.origin.x - viewport.translation.x) / safeScale,
    y: viewport.origin.y + (point.y - viewport.origin.y - viewport.translation.y) / safeScale,
  };
}

export function viewportForPinch(
  initialViewport: TableViewportTransform,
  initialFocalPoint: WindowPoint,
  currentFocalPoint: WindowPoint,
  scale: number,
): TableViewportTransform {
  const anchor = pointInUnscaledViewport(initialFocalPoint, initialViewport);
  return {
    scale: clampTableScale(scale),
    origin: anchor,
    translation: {
      x: currentFocalPoint.x - anchor.x,
      y: currentFocalPoint.y - anchor.y,
    },
  };
}

export function pointInUnscaledTable(
  point: WindowPoint,
  table: WindowTableBounds,
  viewport: TableViewportTransform,
): WindowPoint {
  const logicalPoint = pointInUnscaledViewport(
    { x: point.x - table.x, y: point.y - table.y },
    viewport,
  );
  return { x: table.x + logicalPoint.x, y: table.y + logicalPoint.y };
}
