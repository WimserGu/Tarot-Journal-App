import { describe, expect, it } from 'vitest';

import {
  MAX_TABLE_SCALE,
  MIN_TABLE_SCALE,
  IDENTITY_TABLE_VIEWPORT,
  clampTableScale,
  pinchDistance,
  pinchFocalPoint,
  pointInUnscaledTable,
  pointInUnscaledViewport,
  scaleFromPinch,
  viewportForPinch,
} from '../tableZoom';

describe('tarot table pinch zoom', () => {
  it('measures the distance between the first two touches', () => {
    expect(
      pinchDistance([
        { x: 10, y: 20 },
        { x: 40, y: 60 },
      ]),
    ).toBe(50);
    expect(pinchDistance([{ x: 10, y: 20 }])).toBeNull();
  });

  it('scales relative to the distance at the start of the pinch', () => {
    expect(scaleFromPinch(1, 100, 130)).toBe(1.3);
    expect(scaleFromPinch(1.2, 120, 60)).toBe(0.75);
  });

  it('uses the midpoint between both fingers as the zoom focus', () => {
    expect(
      pinchFocalPoint([
        { x: 20, y: 40 },
        { x: 80, y: 100 },
      ]),
    ).toEqual({ x: 50, y: 70 });
  });

  it('clamps zoom to a readable and controllable range', () => {
    expect(clampTableScale(0.1)).toBe(MIN_TABLE_SCALE);
    expect(clampTableScale(4)).toBe(MAX_TABLE_SCALE);
    expect(clampTableScale(Number.NaN)).toBe(1);
  });

  it('maps a window drop back into the unscaled table coordinate space', () => {
    expect(
      pointInUnscaledTable(
        { x: 400, y: 250 },
        { x: 100, y: 100, width: 400, height: 300 },
        {
          scale: 1.6,
          origin: { x: 50, y: 100 },
          translation: { x: 0, y: 0 },
        },
      ),
    ).toEqual({ x: 306.25, y: 231.25 });
  });

  it('keeps the touched region fixed instead of zooming around the table center', () => {
    const focalPoint = { x: 80, y: 120 };
    const viewport = viewportForPinch(IDENTITY_TABLE_VIEWPORT, focalPoint, focalPoint, 1.5);

    expect(viewport.origin).toEqual(focalPoint);
    expect(pointInUnscaledViewport(focalPoint, viewport)).toEqual(focalPoint);
  });

  it('follows the midpoint when both fingers move during a pinch', () => {
    const viewport = viewportForPinch(
      IDENTITY_TABLE_VIEWPORT,
      { x: 80, y: 120 },
      { x: 110, y: 145 },
      1.4,
    );

    expect(viewport.translation).toEqual({ x: 30, y: 25 });
    expect(pointInUnscaledViewport({ x: 110, y: 145 }, viewport)).toEqual({ x: 80, y: 120 });
  });
});
