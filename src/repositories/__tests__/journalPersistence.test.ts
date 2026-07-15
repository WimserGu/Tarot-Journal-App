import { describe, expect, it } from 'vitest';

import { DEMO_USER_ID, MOCK_TOPIC_IDS } from '../../domain/mockData';
import { MockQuestionTemplateRepository } from '../../features/questions/mockQuestionTemplateRepository';
import { MockReadingRepository } from '../../features/readings/mockReadingRepository';
import { MockTopicRepository } from '../../features/topics/mockTopicRepository';
import { LocalFollowUpRepository } from '../../features/followups/followUpRepository';
import {
  JOURNAL_SCHEMA_VERSION,
  JournalPersistence,
  JournalStorageError,
  journalStorageKeys,
  type JournalKeyValueStorage,
} from '../journalPersistence';
import { journalSeedData, MockJournalStore } from '../mockJournalStore';

class MemoryStorage implements JournalKeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

class FailingStorage extends MemoryStorage {
  override async setItem(): Promise<void> {
    throw new Error('storage unavailable');
  }
}

function createStore(storage: JournalKeyValueStorage, suffix = 'a') {
  let id = 0;

  return new MockJournalStore(journalSeedData, {
    user_id: DEMO_USER_ID,
    now: () => '2026-07-12T09:00:00.000Z',
    create_id: (entity) => `${entity}-${suffix}-${++id}`,
    persistence: new JournalPersistence(storage),
  });
}

describe('Journal persistence', () => {
  it('keeps Topics after a store restart and supports Topic CRUD', async () => {
    const storage = new MemoryStorage();
    const firstStore = createStore(storage);
    const firstRepository = new MockTopicRepository(firstStore);
    const created = await firstRepository.createTopic({
      name: '持久化测试',
      description: '验证重启',
      icon: 'moon',
      isPinned: false,
    });
    const updated = await firstRepository.updateTopic(created.id, {
      name: '已更新议题',
      description: '',
      icon: 'book',
      isPinned: true,
    });
    const restartedRepository = new MockTopicRepository(createStore(storage, 'b'));

    expect((await restartedRepository.getTopicDetail(updated.id))?.topic.title).toBe('已更新议题');
    await restartedRepository.deleteTopic(updated.id);
    expect(await restartedRepository.getTopicDetail(updated.id)).toBeNull();
  });

  it('persists Question Template CRUD through the shared store', async () => {
    const storage = new MemoryStorage();
    const repository = new MockQuestionTemplateRepository(createStore(storage));
    const created = await repository.createQuestionTemplate({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_text: '今天应如何安排？',
      frequency: 'daily',
      is_active: true,
      is_pinned: false,
      position_names: ['现状', '建议'],
    });
    const restartedRepository = new MockQuestionTemplateRepository(
      createStore(storage, 'questions-restart'),
    );
    await restartedRepository.updateQuestionTemplate(created.id, {
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_text: '更新后的问题？',
      frequency: 'weekly',
      is_active: true,
      is_pinned: true,
      position_names: ['阻碍'],
    });
    expect((await restartedRepository.getQuestionTemplate(created.id))?.positions).toHaveLength(1);
    await restartedRepository.deleteQuestionTemplate(created.id);
    expect(await restartedRepository.getQuestionTemplate(created.id)).toBeNull();
  });

  it('persists Reading CRUD after a restart', async () => {
    const storage = new MemoryStorage();
    const repository = new MockReadingRepository(createStore(storage));
    const created = await repository.createReading({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: null,
      temporary_question: '今天关注什么？',
      reading_at: '2026-07-12T08:30:00.000Z',
      reading_timezone: 'Africa/Nairobi',
      interpretation: null,
      status: 'draft',
      cards: [],
    });
    await repository.updateReading(created.id, {
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: null,
      temporary_question: '更新后的问题？',
      reading_at: '2026-07-12T08:30:00.000Z',
      reading_timezone: 'Africa/Nairobi',
      interpretation: '已更新',
      status: 'completed',
      cards: [
        {
          tarot_card_id: 71,
          position_name: null,
          orientation: 'upright',
          position_order: 1,
          interpretation: '这张牌提醒我先完成眼前的一步。',
        },
      ],
    });
    const restartedRepository = new MockReadingRepository(createStore(storage, 'reading-restart'));

    expect((await restartedRepository.getReadingDetail(created.id))?.reading.status).toBe(
      'completed',
    );
    expect(
      (await restartedRepository.getReadingDetail(created.id))?.cards[0]?.reading_card
        .interpretation,
    ).toBe('这张牌提醒我先完成眼前的一步。');
    await restartedRepository.deleteReading(created.id);
    expect(await restartedRepository.getReadingDetail(created.id)).toBeNull();
  });

  it('loads legacy data without a Follow-Up table and persists new Follow-Ups', async () => {
    const storage = new MemoryStorage();
    const firstStore = createStore(storage);
    const first = new LocalFollowUpRepository(firstStore, () => 'UTC');
    expect(await first.listFollowUps()).toEqual([]);
    const created = await first.createFollowUp({
      readingId: journalSeedData.readings[0]!.id,
      scheduledFor: '2026-07-20T09:00:00.000Z',
    });
    const restarted = new LocalFollowUpRepository(
      createStore(storage, 'follow-up-restart'),
      () => 'UTC',
    );
    expect((await restarted.getFollowUp(created.id))?.followUp.id).toBe(created.id);
  });

  it('writes the schema version and migrates version zero', async () => {
    const storage = new MemoryStorage();
    storage.values.set(journalStorageKeys.schema, JSON.stringify({ version: 0 }));
    const store = createStore(storage);
    await store.ready();

    expect(storage.values.get(journalStorageKeys.schema)).toBe(
      JSON.stringify({ version: JOURNAL_SCHEMA_VERSION }),
    );
  });

  it('migrates legacy Reading cards to manual unified card entry', async () => {
    const storage = new MemoryStorage();
    const legacyCard = {
      ...journalSeedData.reading_cards[0]!,
      orientation: 'reversed',
      source: undefined,
      reversalVariant: undefined,
      reversalExpression: 'underexpressed',
      drawSessionId: undefined,
    };
    storage.values.set(journalStorageKeys.schema, JSON.stringify({ version: 3 }));
    storage.values.set(journalStorageKeys.tables.reading_cards, JSON.stringify([legacyCard]));
    const store = createStore(storage, 'card-migration');
    await store.ready();
    expect(store.snapshot().reading_cards[0]).toMatchObject({
      source: 'manual',
      reversalVariant: 'left',
      drawSessionId: null,
      interpretation: null,
    });
    await store.mutate(() => undefined);
    const restored = createStore(storage, 'legacy-card-restored');
    await restored.ready();
    expect(restored.snapshot().reading_cards[0]?.reversalVariant).toBe('left');
  });

  it('round-trips normalized DrawSession table placement through local storage', async () => {
    const storage = new MemoryStorage();
    const session = {
      id: 'draw-session-placement',
      userId: DEMO_USER_ID,
      createdAt: '2026-07-14T09:00:00.000Z',
      updatedAt: '2026-07-14T09:00:00.000Z',
      spreadId: null,
      status: 'draft' as const,
      linkedReadingId: null,
      configuration: {
        cardCount: 1,
        spreadId: 'free-table',
        spreadPositionIds: ['free-table.1'],
        reversalMode: 'standard' as const,
        reversedProbability: 0.5,
        rightProbabilityWhenReversed: 0.5,
        hiddenDeckCardIds: [1, 2, 3],
        ritual: {
          stage: 'reveal' as const,
          drawnCount: 1,
          revealedPositionIndexes: [0],
          isObserving: true,
          cardNotes: { card: 'temporary note' },
        },
        table: {
          placementsByCardId: {
            'position:0': { x: 0.35, y: 0.65, zIndex: 2 },
          },
        },
      },
      cards: [
        {
          id: 'draw-card-placement',
          tarotCardId: 1,
          positionIndex: 0,
          spreadPositionId: 'free-table.1',
          positionSnapshot: 'Card 1',
          orientation: 'upright' as const,
          reversalVariant: null,
          source: 'drawn' as const,
          drawSessionId: 'draw-session-placement',
        },
      ],
    };
    const legacySession = {
      ...session,
      configuration: {
        ...session.configuration,
        reversalMode: 'expression',
        rightProbabilityWhenReversed: undefined,
        overexpressedProbabilityWhenReversed: 0.25,
      },
      cards: session.cards.map(({ reversalVariant: _reversalVariant, ...card }) => ({
        ...card,
        orientation: 'reversed',
        reversalExpression: 'overexpressed',
      })),
    };
    storage.values.set(
      journalStorageKeys.schema,
      JSON.stringify({ version: JOURNAL_SCHEMA_VERSION }),
    );
    storage.values.set(journalStorageKeys.tables.draw_sessions, JSON.stringify([legacySession]));

    const first = createStore(storage, 'placement-first');
    await first.ready();
    await first.mutate(() => undefined);
    const restored = createStore(storage, 'placement-restored');
    await restored.ready();

    expect(restored.snapshot().draw_sessions?.[0]?.configuration).toMatchObject({
      reversalMode: 'dual',
      rightProbabilityWhenReversed: 0.25,
      hiddenDeckCardIds: [1, 2, 3],
      ritual: {
        revealedPositionIndexes: [0],
        isObserving: true,
        cardNotes: { card: 'temporary note' },
      },
      table: {
        placementsByCardId: {
          'position:0': { x: 0.35, y: 0.65, zIndex: 2 },
        },
      },
    });
    expect(restored.snapshot().draw_sessions?.[0]?.cards[0]?.reversalVariant).toBe('right');
  });

  it('safely recovers from malformed JSON and skips malformed records', async () => {
    const storage = new MemoryStorage();
    storage.values.set(journalStorageKeys.tables.topics, '{not-json');
    const malformedStore = createStore(storage);
    await malformedStore.ready();
    expect(malformedStore.getRecoveryNotices()).toHaveLength(1);
    expect(malformedStore.snapshot().topics).toHaveLength(journalSeedData.topics.length);

    storage.values.set(
      journalStorageKeys.tables.readings,
      JSON.stringify([{}, journalSeedData.readings[0]]),
    );
    const partialStore = createStore(storage, 'partial');
    await partialStore.ready();
    expect(partialStore.snapshot().readings).toHaveLength(1);
    expect(partialStore.getRecoveryNotices().length).toBeGreaterThan(0);
  });

  it('serializes concurrent writes without losing either Topic', async () => {
    const storage = new MemoryStorage();
    const repository = new MockTopicRepository(createStore(storage));

    await Promise.all([
      repository.createTopic({ name: '并发一', description: '', icon: 'book', isPinned: false }),
      repository.createTopic({ name: '并发二', description: '', icon: 'heart', isPinned: false }),
    ]);
    const names = (await repository.listTopics()).map((item) => item.topic.title);

    expect(names).toEqual(expect.arrayContaining(['并发一', '并发二']));
  });

  it('resets development test data through the shared store', async () => {
    const storage = new MemoryStorage();
    const store = createStore(storage);
    const repository = new MockTopicRepository(store);
    await repository.createTopic({
      name: '临时议题',
      description: '',
      icon: 'book',
      isPinned: false,
    });
    await store.resetToSeed();

    expect((await repository.listTopics()).map((item) => item.topic.title)).not.toContain(
      '临时议题',
    );
  });

  it('reports stable storage errors without crashing repositories', async () => {
    const store = createStore(new FailingStorage());
    await expect(store.mutate(() => undefined)).rejects.toBeInstanceOf(JournalStorageError);
  });
});
