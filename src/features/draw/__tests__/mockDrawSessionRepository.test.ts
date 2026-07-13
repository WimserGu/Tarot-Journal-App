import { describe, expect, it } from 'vitest';

import { journalSeedData, MockJournalStore } from '../../../repositories/mockJournalStore';
import { ValidationRepositoryError } from '../../../repositories/repositoryErrors';
import { MockDrawSessionRepository } from '../mockDrawSessionRepository';
import { DEFAULT_DRAW_CONFIGURATION } from '../drawTypes';

function repository() {
  let id = 0;
  const store = new MockJournalStore(journalSeedData, {
    user_id: 'user-1',
    now: () => '2026-07-13T12:00:00.000Z',
    create_id: (entity) => `${entity}-${++id}`,
  });
  return { sessions: new MockDrawSessionRepository(store), store };
}

const input = () => ({
  spreadId: 'single-card',
  configuration: DEFAULT_DRAW_CONFIGURATION,
  cards: [
    {
      id: 'drawn-1',
      tarotCardId: 0,
      positionIndex: 0,
      spreadPositionId: 'single-card.reflection',
      orientation: 'upright' as const,
      reversalExpression: null,
      source: 'drawn' as const,
      drawSessionId: null,
    },
  ],
});

describe('MockDrawSessionRepository', () => {
  it('persists a draft and restores it as the one active draft', async () => {
    const { sessions } = repository();
    const draft = await sessions.create(input());
    expect((await sessions.getActiveDraft())?.id).toBe(draft.id);
    expect(draft.cards[0]?.positionSnapshot).toBe('Reflection');
    await expect(sessions.create(input())).rejects.toBeInstanceOf(ValidationRepositoryError);
  });

  it('marks a draft as saved without changing its original cards', async () => {
    const { sessions } = repository();
    const draft = await sessions.create(input());
    const saved = await sessions.update(draft.id, {
      cards: draft.cards,
      configuration: draft.configuration,
      spreadId: draft.spreadId,
      status: 'saved',
      linkedReadingId: 'reading-1',
    });
    expect(saved).toMatchObject({ status: 'saved', linkedReadingId: 'reading-1' });
    expect(saved.cards[0]).toMatchObject({ tarotCardId: 0, orientation: 'upright' });
    expect(await sessions.getActiveDraft()).toBeNull();
  });

  it('permanently deletes discarded drafts in phase 1', async () => {
    const { sessions } = repository();
    const draft = await sessions.create(input());
    await sessions.delete(draft.id);
    expect(await sessions.get(draft.id)).toBeNull();
    expect(await sessions.list()).toEqual([]);
  });

  it('finds multiple Readings that reference one immutable DrawSession', async () => {
    const { sessions, store } = repository();
    const session = await sessions.create(input());
    const sourceReading = journalSeedData.readings[0]!;
    const sourceCard = journalSeedData.reading_cards[0]!;
    await store.mutate((data) => {
      data.readings.push(
        { ...sourceReading, id: 'reading-a', user_id: 'user-1' },
        { ...sourceReading, id: 'reading-b', user_id: 'user-1' },
      );
      data.reading_cards.push(
        {
          ...sourceCard,
          id: 'card-a',
          user_id: 'user-1',
          reading_id: 'reading-a',
          source: 'drawn',
          drawSessionId: session.id,
        },
        {
          ...sourceCard,
          id: 'card-b',
          user_id: 'user-1',
          reading_id: 'reading-b',
          source: 'drawn',
          drawSessionId: session.id,
        },
      );
    });
    expect((await sessions.listRelatedReadings(session.id)).map((reading) => reading.id)).toEqual([
      'reading-a',
      'reading-b',
    ]);
    expect((await sessions.get(session.id))?.cards[0]).toMatchObject({ orientation: 'upright' });
  });
});
