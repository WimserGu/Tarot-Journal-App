import { describe, expect, it } from 'vitest';
import { createLatestDrawSessionWriteQueue } from '../drawSessionWriteQueue';
import { DEFAULT_DRAW_CONFIGURATION, type DrawSession } from '../drawTypes';

function sessionWithCards(cardCount: number): DrawSession {
  return {
    id: 'session',
    userId: 'user',
    createdAt: '2026-07-14T00:00:00Z',
    updatedAt: '2026-07-14T00:00:00Z',
    spreadId: null,
    status: 'draft',
    linkedReadingId: null,
    configuration: {
      ...DEFAULT_DRAW_CONFIGURATION,
      cardCount,
      spreadId: 'free-table',
      spreadPositionIds: [],
    },
    cards: [],
  };
}

describe('DrawSession write queue', () => {
  it('allows rapid optimistic changes while saving only the latest pending state', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstWrite = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const writtenCounts: number[] = [];
    const queue = createLatestDrawSessionWriteQueue(async (session) => {
      writtenCounts.push(session.configuration.cardCount);
      if (writtenCounts.length === 1) await firstWrite;
      return session;
    });

    const first = queue.enqueue(sessionWithCards(1));
    const second = queue.enqueue(sessionWithCards(2));
    const third = queue.enqueue(sessionWithCards(3));

    // Interaction remains local and immediate while the first repository write is still pending.
    expect(writtenCounts).toEqual([1]);
    releaseFirst?.();
    await Promise.all([first, second, third]);
    expect(writtenCounts).toEqual([1, 3]);
  });

  it('continues with the newest pending state after an earlier write fails', async () => {
    let attempts = 0;
    const queue = createLatestDrawSessionWriteQueue(async (session) => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return session;
    });

    const failed = queue.enqueue(sessionWithCards(1));
    const latest = queue.enqueue(sessionWithCards(2));

    await expect(failed).rejects.toThrow('offline');
    await expect(latest).resolves.toMatchObject({ configuration: { cardCount: 2 } });
  });
});
