import {
  DEMO_USER_ID,
  mockQuestionTemplatePositions,
  mockQuestionTemplates,
  mockReadingCards,
  mockReadings,
  mockTopics,
} from '../domain/mockData';
import { tarotCards } from '../domain/tarotCards';
import type { ISODateTime, UUID } from '../domain/types';

import {
  asyncStorageAdapter,
  JournalPersistence,
  type JournalRecoveryNotice,
} from './journalPersistence';
import type { JournalData, MutableJournalData } from './journalData';

export type JournalStoreOptions = {
  create_id?: (
    entity:
      'topic' | 'reading' | 'reading-card' | 'question-template' | 'question-template-position',
  ) => UUID;
  now?: () => ISODateTime;
  persistence?: JournalPersistence;
  user_id: UUID;
};

export type MockJournalStoreOptions = JournalStoreOptions;

function defaultNow(): ISODateTime {
  return new Date().toISOString();
}

function defaultCreateId(
  entity: 'topic' | 'reading' | 'reading-card' | 'question-template' | 'question-template-position',
): UUID {
  return `local-${entity}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function copyData(data: JournalData): MutableJournalData {
  return {
    topics: [...data.topics],
    question_templates: [...data.question_templates],
    question_template_positions: [...data.question_template_positions],
    readings: [...data.readings],
    reading_cards: [...data.reading_cards],
    tarot_cards: [...data.tarot_cards],
  };
}

export const journalSeedData: JournalData = {
  topics: mockTopics,
  question_templates: mockQuestionTemplates,
  question_template_positions: mockQuestionTemplatePositions,
  readings: mockReadings,
  reading_cards: mockReadingCards,
  tarot_cards: tarotCards,
};

/** One shared journal state with optional durable persistence below repository adapters. */
export class JournalStore {
  private data: MutableJournalData;
  private readonly hydration: Promise<void>;
  private readonly idProvider: (
    entity:
      'topic' | 'reading' | 'reading-card' | 'question-template' | 'question-template-position',
  ) => UUID;
  private readonly listeners = new Set<() => void>();
  private readonly nowProvider: () => ISODateTime;
  private recoveryNotices: JournalRecoveryNotice[] = [];
  private writeQueue: Promise<void> = Promise.resolve();
  readonly userId: UUID;

  constructor(
    private readonly seed: JournalData,
    private readonly options: JournalStoreOptions,
  ) {
    this.data = copyData(seed);
    this.userId = options.user_id;
    this.nowProvider = options.now ?? defaultNow;
    this.idProvider = options.create_id ?? defaultCreateId;
    this.hydration = options.persistence ? this.hydrate(options.persistence) : Promise.resolve();
  }

  async ready(): Promise<void> {
    await this.hydration;
  }

  snapshot(): JournalData {
    return this.data;
  }

  now(): ISODateTime {
    return this.nowProvider();
  }

  createId(
    entity:
      'topic' | 'reading' | 'reading-card' | 'question-template' | 'question-template-position',
  ): UUID {
    return this.idProvider(entity);
  }

  getRecoveryNotices(): readonly JournalRecoveryNotice[] {
    return this.recoveryNotices;
  }

  async mutate(mutator: (data: MutableJournalData) => void): Promise<void> {
    const nextWrite = this.writeQueue.then(async () => {
      mutator(this.data);
      this.listeners.forEach((listener) => listener());
      await this.persist();
    });
    this.writeQueue = nextWrite.catch(() => undefined);

    await nextWrite;
  }

  async resetToSeed(): Promise<void> {
    await this.mutate((data) => {
      const seed = copyData(this.seed);
      data.topics = seed.topics;
      data.question_templates = seed.question_templates;
      data.question_template_positions = seed.question_template_positions;
      data.readings = seed.readings;
      data.reading_cards = seed.reading_cards;
      data.tarot_cards = seed.tarot_cards;
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private async hydrate(persistence: JournalPersistence): Promise<void> {
    try {
      const result = await persistence.load(this.seed);
      this.data = result.data;
      this.recoveryNotices = result.recovery_notices;
      this.listeners.forEach((listener) => listener());
      await persistence.save(this.data);
    } catch (error) {
      this.recoveryNotices = [
        {
          key: 'storage',
          message:
            error instanceof Error ? error.message : '本地数据无法加载，已使用安全的初始数据。',
        },
      ];
    }
  }

  private async persist(): Promise<void> {
    if (this.options.persistence) {
      await this.options.persistence.save(this.data);
    }
  }
}

/** In-memory test double using the same JournalStore contract. */
export class MockJournalStore extends JournalStore {}

export const journalStore = new JournalStore(journalSeedData, {
  user_id: DEMO_USER_ID,
  persistence: new JournalPersistence(asyncStorageAdapter),
});

/** Compatibility export retained while feature adapters migrate to JournalStore. */
export const mockJournalStore = journalStore;
