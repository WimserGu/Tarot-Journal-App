import { describe, expect, it } from 'vitest';
import { beginReveal, drawNextCard, revealCard, ritualState, startRitual } from '../drawRitual';
import { DEFAULT_DRAW_CONFIGURATION, type DrawSession } from '../drawTypes';

const session: DrawSession = {
  id: 'session',
  userId: 'user',
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z',
  spreadId: 'single-card',
  status: 'draft',
  linkedReadingId: null,
  configuration: { ...DEFAULT_DRAW_CONFIGURATION, cardCount: 2 },
  cards: [0, 1].map((positionIndex) => ({
    id: `card-${positionIndex}`,
    tarotCardId: positionIndex + 1,
    positionIndex,
    spreadPositionId: 'single-card.reflection',
    orientation: 'upright' as const,
    reversalExpression: null,
    source: 'drawn' as const,
    drawSessionId: 'session',
  })),
};
describe('draw ritual', () => {
  it('requires drawing all cards before reveal and persists reveal progress in DrawSession configuration', () => {
    const prepared = startRitual(session);
    const first = drawNextCard(prepared);
    const second = drawNextCard(first);
    expect(ritualState(first)).toMatchObject({ stage: 'draw', drawnCount: 1 });
    expect(ritualState(second)).toMatchObject({ stage: 'reveal', drawnCount: 2 });
    expect(ritualState(revealCard(second, 1))).toMatchObject({ revealedPositionIndexes: [1] });
  });
  it('does not reveal a card that has not been drawn and finishes after all cards are revealed', () => {
    const started = startRitual(session);
    expect(revealCard(started, 0)).toBe(started);
    const ready = beginReveal(drawNextCard(drawNextCard(started)));
    expect(ritualState(revealCard(revealCard(ready, 0), 1)).stage).toBe('reflection');
  });
});
