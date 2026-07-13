import { describe, expect, it } from 'vitest';
import { revealCard, ritualState } from '../drawRitual';
import { DEFAULT_DRAW_CONFIGURATION, type DrawSession } from '../drawTypes';

const session: DrawSession = {
  id: 'free',
  userId: 'user',
  createdAt: '2026-07-13T00:00:00Z',
  updatedAt: '2026-07-13T00:00:00Z',
  spreadId: 'free-table',
  status: 'draft',
  linkedReadingId: null,
  configuration: {
    ...DEFAULT_DRAW_CONFIGURATION,
    cardCount: 2,
    spreadId: 'free-table',
    spreadPositionIds: ['free-table.1', 'free-table.2'],
    questionText: 'What matters?',
    ritual: { stage: 'draw', drawnCount: 2, revealedPositionIndexes: [] },
  },
  cards: [0, 1].map((positionIndex) => ({
    id: `card-${positionIndex}`,
    tarotCardId: positionIndex + 1,
    positionIndex,
    spreadPositionId: `free-table.${positionIndex + 1}`,
    orientation: 'upright' as const,
    reversalExpression: null,
    source: 'drawn' as const,
    drawSessionId: 'free',
  })),
};

describe('free tarot table state', () => {
  it('keeps a stored question, unique draw order, and partial reveal progress', () => {
    const resumed = revealCard(session, 0);
    expect(resumed.configuration.questionText).toBe('What matters?');
    expect(new Set(resumed.cards.map((card) => card.tarotCardId)).size).toBe(2);
    expect(ritualState(resumed)).toMatchObject({
      stage: 'reveal',
      drawnCount: 2,
      revealedPositionIndexes: [0],
    });
  });
});
