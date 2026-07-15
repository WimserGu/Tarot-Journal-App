import type { Reading, ReadingCard, UUID } from '../../domain/types';
import { JournalStore, mockJournalStore } from '../../repositories/mockJournalStore';

import {
  buildReadingDetail,
  buildReadingFormContext,
  buildQuestionHistory,
  buildTopicTimeline,
  validateReadingCreateInput,
  type CreateReadingInput,
  type BatchAssignQuestionTagInput,
  type ReadingDeletionSummary,
  type ReadingDetail,
  type ReadingFormContext,
  type ReadingRepository,
  type QuestionHistory,
  type QuestionHistoryQuery,
  type ReadingTimelineItem,
  type ReadingListFilters,
  type TopicTimelineFilters,
  type UpdateReadingInput,
  ReadingNotFoundError,
  ReadingValidationError,
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
      question_tag_id: values.question_tag_id,
      question_text_snapshot: values.question_text_snapshot,
      spread_id: values.spread_id,
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
      reversalVariant: card.reversalVariant,
      source: card.source,
      drawSessionId: card.drawSessionId,
      spreadPositionId: card.spreadPositionId,
      interpretation: card.interpretation,
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

  async listReadings(filters: ReadingListFilters = {}): Promise<ReadingTimelineItem[]> {
    await this.store.ready();
    const topicIds = new Set(
      this.store
        .snapshot()
        .topics.filter((topic) => topic.user_id === this.store.userId)
        .map((topic) => topic.id),
    );
    const query = filters.text_query?.trim().toLocaleLowerCase('zh-CN');
    return this.store
      .snapshot()
      .readings.filter(
        (reading) =>
          reading.user_id === this.store.userId &&
          reading.topic_id !== null &&
          topicIds.has(reading.topic_id),
      )
      .filter((reading) => !filters.topic_id || reading.topic_id === filters.topic_id)
      .filter(
        (reading) =>
          !filters.question_template_id ||
          reading.question_template_id === filters.question_template_id,
      )
      .filter((reading) => !filters.status || reading.status === filters.status)
      .filter(
        (reading) =>
          filters.is_favorite === undefined || reading.is_favorite === filters.is_favorite,
      )
      .filter((reading) => !filters.date_from || reading.reading_at >= filters.date_from)
      .filter((reading) => !filters.date_to || reading.reading_at <= filters.date_to)
      .filter(
        (reading) =>
          !query ||
          [reading.question_text_snapshot, reading.interpretation, reading.reality_feedback].some(
            (value) => value?.toLocaleLowerCase('zh-CN').includes(query),
          ),
      )
      .map((reading) =>
        buildTopicTimeline(this.store.snapshot(), this.store.userId, {
          topic_id: reading.topic_id!,
        }).find((item) => item.reading.id === reading.id)!,
      )
      .filter(Boolean)
      .sort((a, b) => b.reading.reading_at.localeCompare(a.reading.reading_at));
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
      question_tag_id: values.question_tag_id,
      question_text_snapshot: questionTextSnapshot,
      spread_id: values.spread_id,
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
      reversalVariant: card.reversalVariant,
      source: card.source,
      drawSessionId: card.drawSessionId,
      spreadPositionId: card.spreadPositionId,
      interpretation: card.interpretation,
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

  async assignQuestionTag(input: BatchAssignQuestionTagInput): Promise<Reading[]> {
    await this.store.ready();
    const readingIds = [...new Set(input.reading_ids)];
    const snapshot = this.store.snapshot();
    const tag = snapshot.question_tags?.find(
      (item) =>
        item.id === input.question_tag_id &&
        item.topic_id === input.topic_id &&
        item.user_id === this.store.userId,
    );
    const readings = readingIds.map((readingId) =>
      snapshot.readings.find(
        (reading) =>
          reading.id === readingId &&
          reading.topic_id === input.topic_id &&
          reading.user_id === this.store.userId,
      ),
    );
    if (!tag) throw new ReadingValidationError('选择的问题标签不属于当前 Topic。');
    if (readingIds.length === 0 || readings.some((reading) => !reading))
      throw new ReadingValidationError('请选择当前 Topic 中的有效记录。');
    const now = this.store.now();
    await this.store.mutate((data) => {
      readingIds.forEach((readingId) => {
        const index = data.readings.findIndex((reading) => reading.id === readingId);
        data.readings[index] = {
          ...data.readings[index]!,
          question_tag_id: input.question_tag_id,
          updated_at: now,
        };
      });
    });
    return readings.map((reading) => ({
      ...reading!,
      question_tag_id: input.question_tag_id,
      updated_at: now,
    }));
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
    const followUpCount = this.store
      .snapshot()
      .reading_follow_ups.filter((followUp) => followUp.readingId === readingId).length;

    await this.store.mutate((data) => {
      data.readings = data.readings.filter((reading) => reading.id !== readingId);
      data.reading_cards = data.reading_cards.filter((card) => card.reading_id !== readingId);
      data.reading_follow_ups = data.reading_follow_ups.filter(
        (followUp) => followUp.readingId !== readingId,
      );
    });

    return { reading_id: readingId, card_count: cardCount, follow_up_count: followUpCount };
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
