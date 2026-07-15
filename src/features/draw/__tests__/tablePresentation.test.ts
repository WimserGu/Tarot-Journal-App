import { describe, expect, it } from 'vitest';
import {
  DECK_DRAG_THRESHOLD,
  TABLE_CARD_PICKUP_THRESHOLD,
  TABLE_EDGE_SCROLL_INDICATOR_VISIBLE,
  centeredLoopOffset,
  deckCardGestureIntent,
  deckGestureIntent,
  loopedDeckItems,
  naturalCardOffset,
  recenteredLoopOffset,
} from '../deckEdgeGestures';

describe('tarot table presentation helpers', () => {
  it('treats a small pointer movement as a card selection', () => {
    expect(deckGestureIntent(DECK_DRAG_THRESHOLD - 1, 0)).toBe('select');
  });

  it('treats movement at the drag threshold as deck scrolling', () => {
    expect(deckGestureIntent(DECK_DRAG_THRESHOLD, 0)).toBe('drag');
    expect(deckGestureIntent(0, -DECK_DRAG_THRESHOLD)).toBe('drag');
  });

  it('distinguishes a direct upward table drag from horizontal deck scrolling', () => {
    expect(deckCardGestureIntent(2, -12)).toBe('table-drag');
    expect(deckCardGestureIntent(12, -2)).toBe('scroll');
    expect(deckCardGestureIntent(2, -2)).toBe('select');
  });

  it('picks up a river card after only a small deliberate vertical movement', () => {
    expect(TABLE_CARD_PICKUP_THRESHOLD).toBeLessThan(DECK_DRAG_THRESHOLD);
    expect(deckCardGestureIntent(0, -TABLE_CARD_PICKUP_THRESHOLD)).toBe('table-drag');
  });

  it('uses deterministic natural offsets without changing draw order', () => {
    expect([0, 1, 2, 3, 4, 5].map(naturalCardOffset)).toEqual([0, 10, 4, 14, 7, 0]);
  });

  it('keeps the browser scrollbar hidden at the table edge', () => {
    expect(TABLE_EDGE_SCROLL_INDICATOR_VISIBLE).toBe(false);
  });

  it('repeats the hidden deck without changing its internal card mapping', () => {
    expect(loopedDeckItems([8, 3])).toEqual([
      { cardId: 8, cycle: 0, position: 0 },
      { cardId: 3, cycle: 0, position: 1 },
      { cardId: 8, cycle: 1, position: 0 },
      { cardId: 3, cycle: 1, position: 1 },
      { cardId: 8, cycle: 2, position: 0 },
      { cardId: 3, cycle: 2, position: 1 },
    ]);
  });

  it('wraps either scroll direction back into the center copy', () => {
    expect(centeredLoopOffset(-20, 100)).toBe(180);
    expect(recenteredLoopOffset(20, 100)).toBe(120);
    expect(recenteredLoopOffset(280, 100)).toBe(180);
    expect(recenteredLoopOffset(140, 100)).toBe(140);
  });
});
