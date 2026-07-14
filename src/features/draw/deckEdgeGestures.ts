export const DECK_DRAG_THRESHOLD = 8;
export const TABLE_EDGE_SCROLL_INDICATOR_VISIBLE = false;

export type LoopedDeckItem = {
  cardId: number;
  cycle: number;
  position: number;
};

export function loopedDeckItems(cardIds: readonly number[]): LoopedDeckItem[] {
  return [0, 1, 2].flatMap((cycle) =>
    cardIds.map((cardId, position) => ({ cardId, cycle, position })),
  );
}

export function centeredLoopOffset(offset: number, segmentWidth: number): number {
  if (segmentWidth <= 0) return 0;
  const positionWithinDeck = ((offset % segmentWidth) + segmentWidth) % segmentWidth;
  return segmentWidth + positionWithinDeck;
}

export function recenteredLoopOffset(offset: number, segmentWidth: number): number {
  if (segmentWidth <= 0) return 0;
  if (offset < segmentWidth * 0.5 || offset > segmentWidth * 2.5) {
    return centeredLoopOffset(offset, segmentWidth);
  }
  return offset;
}

export function deckGestureIntent(
  deltaX: number,
  deltaY: number,
  threshold = DECK_DRAG_THRESHOLD,
): 'select' | 'drag' {
  return Math.hypot(deltaX, deltaY) >= threshold ? 'drag' : 'select';
}

export function naturalCardOffset(index: number) {
  const offsets = [0, 10, 4, 14, 7] as const;
  return offsets[index % offsets.length] ?? 0;
}
