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

import type { JournalData, MutableJournalData } from './journalData';

export type MockJournalStoreOptions = {
  user_id: UUID;
  now?: () => ISODateTime;
  create_id?: (entity: 'topic' | 'reading' | 'reading-card') => UUID;
};

function defaultNow(): ISODateTime {
  return new Date().toISOString();
}

function defaultCreateId(entity: 'topic' | 'reading' | 'reading-card'): UUID {
  return `mock-${entity}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

/** Shared in-memory source for local repositories during MVP development. */
export class MockJournalStore {
  private data: MutableJournalData;
  private readonly listeners = new Set<() => void>();
  private readonly nowProvider: () => ISODateTime;
  private readonly idProvider: (entity: 'topic' | 'reading' | 'reading-card') => UUID;
  readonly userId: UUID;

  constructor(data: JournalData, options: MockJournalStoreOptions) {
    this.data = copyData(data);
    this.userId = options.user_id;
    this.nowProvider = options.now ?? defaultNow;
    this.idProvider = options.create_id ?? defaultCreateId;
  }

  snapshot(): JournalData {
    return this.data;
  }

  now(): ISODateTime {
    return this.nowProvider();
  }

  createId(entity: 'topic' | 'reading' | 'reading-card'): UUID {
    return this.idProvider(entity);
  }

  mutate(mutator: (data: MutableJournalData) => void): void {
    mutator(this.data);
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const mockJournalStore = new MockJournalStore(
  {
    topics: mockTopics,
    question_templates: mockQuestionTemplates,
    question_template_positions: mockQuestionTemplatePositions,
    readings: mockReadings,
    reading_cards: mockReadingCards,
    tarot_cards: tarotCards,
  },
  { user_id: DEMO_USER_ID },
);
