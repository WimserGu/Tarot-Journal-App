import type { Reading, ReadingCard, UUID } from '../../domain/types';
import { JournalStore, mockJournalStore } from '../../repositories/mockJournalStore';

import {
  buildReadingDetail,
  buildReadingFormContext,
  buildQuestionHistory,
  buildTopicTimeline,
  validateReadingCreateInput,
  type CreateReadingInput,
  type ReadingDeletionSummary,
  type ReadingDetail,
  type ReadingFormContext,
  type ReadingRepository,
  type QuestionHistory,
  type QuestionHistoryQuery,
  type ReadingTimelineItem,
  type TopicTimelineFilters,
  type UpdateReadingInput,
  ReadingNotFoundError,
} from './readingRepository';

export class MockReadingRepository implements ReadingRepository {
  constructor(private readonly store: JournalStore) {}

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async getReadingFormContext(): Promise<ReadingFormContext> {
    await this.store.ready();
    return buildReadingFormContext(this.store.snapshot(), this.store.userId);
  }

  async createReading(input: CreateReadingInput): Promise<Reading> {
    await this.store.ready();
    const values = validateReadingCreateInput(this.store.snapshot(), this.store.userId, input);
    const now = this.store.now();
    const reading: Reading = {
      id: this.store.createId('reading'),
      user_id: this.store.userId,
      topic_id: values.topic_id,
      question_template_id: values.question_template_id,
      question_text_snapshot: values.question_text_snapshot,
      reading_at: values.reading_at,
      reading_timezone: values.reading_timezone,
      interpretation: values.interpretation,
      reality_feedback: null,
      status: values.status,
      is_favorite: false,
      created_at: now,
      updated_at: now,
    };
    const readingCards: ReadingCard[] = values.cards.map((card) => ({
      id: this.store.createId('reading-card'),
      user_id: this.store.userId,
      reading_id: reading.id,
      tarot_card_id: card.tarot_card_id,
      position_order: card.position_order,
      position_name: card.position_name,
      orientation: card.orientation,
      created_at: now,
      updated_at: now,
    }));

    await this.store.mutate((data) => {
      data.readings.push(reading);
      data.reading_cards.push(...readingCards);

      const topicIndex = data.topics.findIndex((topic) => topic.id === reading.topic_id);
      const currentTopic = data.topics[topicIndex];

      if (currentTopic) {
        data.topics[topicIndex] = { ...currentTopic, updated_at: now };
      }
    });

    return reading;
  }

  async getReadingDetail(readingId: UUID): Promise<ReadingDetail | null> {
    await this.store.ready();
    return buildReadingDetail(this.store.snapshot(), this.store.userId, readingId);
  }

  async getTopicTimeline(filters: TopicTimelineFilters): Promise<ReadingTimelineItem[]> {
    await this.store.ready();
    return buildTopicTimeline(this.store.snapshot(), this.store.userId, filters);
  }

  async getQuestionHistory(query: QuestionHistoryQuery): Promise<QuestionHistory | null> {
    await this.store.ready();
    return buildQuestionHistory(this.store.snapshot(), this.store.userId, query);
  }

  async updateReading(readingId: UUID, input: UpdateReadingInput): Promise<Reading> {
    await this.store.ready();
    const currentReading = this.store
      .snapshot()
      .readings.find(
        (reading) => reading.id === readingId && reading.user_id === this.store.userId,
      );

    if (!currentReading) {
      throw new ReadingNotFoundError();
    }

    const values = validateReadingCreateInput(this.store.snapshot(), this.store.userId, input);
    const now = this.store.now();
    const questionTextSnapshot =
      currentReading.question_template_id === values.question_template_id
        ? currentReading.question_text_snapshot
        : values.question_text_snapshot;
    const updatedReading: Reading = {
      ...currentReading,
      topic_id: values.topic_id,
      question_template_id: values.question_template_id,
      question_text_snapshot: questionTextSnapshot,
      reading_at: values.reading_at,
      reading_timezone: values.reading_timezone,
      interpretation: values.interpretation,
      status: values.status,
      updated_at: now,
    };
    const readingCards: ReadingCard[] = values.cards.map((card) => ({
      id: this.store.createId('reading-card'),
      user_id: this.store.userId,
      reading_id: readingId,
      tarot_card_id: card.tarot_card_id,
      position_order: card.position_order,
      position_name: card.position_name,
      orientation: card.orientation,
      created_at: now,
      updated_at: now,
    }));

    await this.store.mutate((data) => {
      const readingIndex = data.readings.findIndex((reading) => reading.id === readingId);
      data.readings[readingIndex] = updatedReading;
      data.reading_cards = data.reading_cards.filter((card) => card.reading_id !== readingId);
      data.reading_cards.push(...readingCards);

      const topicIndex = data.topics.findIndex((topic) => topic.id === updatedReading.topic_id);
      const currentTopic = data.topics[topicIndex];

      if (currentTopic) {
        data.topics[topicIndex] = { ...currentTopic, updated_at: now };
      }
    });

    return updatedReading;
  }

  async deleteReading(readingId: UUID): Promise<ReadingDeletionSummary> {
    await this.store.ready();
    const currentReading = this.store
      .snapshot()
      .readings.find(
        (reading) => reading.id === readingId && reading.user_id === this.store.userId,
      );

    if (!currentReading) {
      throw new ReadingNotFoundError();
    }

    const cardCount = this.store
      .snapshot()
      .reading_cards.filter(
        (card) => card.reading_id === readingId && card.user_id === this.store.userId,
      ).length;

    await this.store.mutate((data) => {
      data.readings = data.readings.filter((reading) => reading.id !== readingId);
      data.reading_cards = data.reading_cards.filter((card) => card.reading_id !== readingId);
    });

    return { reading_id: readingId, card_count: cardCount };
  }

  async toggleFavorite(readingId: UUID): Promise<Reading> {
    await this.store.ready();
    const currentReading = this.store
      .snapshot()
      .readings.find(
        (reading) => reading.id === readingId && reading.user_id === this.store.userId,
      );

    if (!currentReading) {
      throw new ReadingNotFoundError();
    }

    const updatedReading: Reading = {
      ...currentReading,
      is_favorite: !currentReading.is_favorite,
      updated_at: this.store.now(),
    };

    await this.store.mutate((data) => {
      const readingIndex = data.readings.findIndex((reading) => reading.id === readingId);
      data.readings[readingIndex] = updatedReading;
    });

    return updatedReading;
  }
}

export const readingRepository = new MockReadingRepository(mockJournalStore);
