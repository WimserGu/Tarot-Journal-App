import { describe, expect, it } from 'vitest';
import { MockDrawSessionRepository } from '../mockDrawSessionRepository';
import { journalSeedData, MockJournalStore } from '../../../repositories/mockJournalStore';
import { DEFAULT_DRAW_CONFIGURATION } from '../drawTypes';

describe('free table DrawSession persistence', () => {
  it('persists free-table metadata without using a spread_id', async () => {
    const repository = new MockDrawSessionRepository(
      new MockJournalStore(journalSeedData, {
        user_id: 'user-1',
        now: () => '2026-07-13T00:00:00.000Z',
        create_id: () => 'free-session',
      }),
    );
    const session = await repository.create({
      spreadId: null,
      cards: [],
      configuration: {
        ...DEFAULT_DRAW_CONFIGURATION,
        cardCount: 0,
        spreadId: 'free-table',
        spreadPositionIds: [],
        questionText: 'private question',
        hiddenDeckCardIds: [1, 2],
        ritual: { stage: 'draw', drawnCount: 0, revealedPositionIndexes: [] },
        table: {
          placementsByCardId: {
            'position:0': { x: 0.3, y: 0.7, zIndex: 1 },
          },
        },
      },
    });
    expect(session.spreadId).toBeNull();
    expect(session.configuration.hiddenDeckCardIds).toEqual([1, 2]);
    expect((await repository.get(session.id))?.configuration.table).toEqual(
      session.configuration.table,
    );
  });
});
