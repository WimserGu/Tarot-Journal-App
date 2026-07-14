import { describe, expect, it } from 'vitest';
import { createHiddenDeck, remainingHiddenDeck } from '../hiddenDeck';
import type { DrawSession } from '../drawTypes';

describe('hidden deck', () => {
  it('creates one deterministic shuffled mapping and removes only selected cards', () => {
    const deck = createHiddenDeck([{ id: 1 }, { id: 2 }, { id: 3 }] as never, () => 0);
    const session = {
      configuration: { hiddenDeckCardIds: deck },
      cards: [{ tarotCardId: deck[1] }],
    } as DrawSession;
    expect(deck).toEqual([2, 3, 1]);
    expect(remainingHiddenDeck(session)).toEqual([2, 1]);
    expect(remainingHiddenDeck(session)).toEqual([2, 1]);
  });
});
