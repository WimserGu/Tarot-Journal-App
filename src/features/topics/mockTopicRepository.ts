import type { Topic, UUID } from '../../domain/types';
import {
  MockJournalStore,
  mockJournalStore,
  type MockJournalStoreOptions,
} from '../../repositories/mockJournalStore';

import { topicFormSchema, type TopicFormValues } from './topicSchema';
import {
  buildTopicDeletionSummary,
  buildTopicDetail,
  buildTopicListItems,
  type TopicDeletionSummary,
  type TopicDetail,
  type TopicListItem,
  type TopicRepository,
  type TopicRepositoryData,
} from './topicRepository';

export type MockTopicRepositoryOptions = MockJournalStoreOptions;

export class TopicNotFoundError extends Error {
  constructor() {
    super('未找到这个长期议题。');
    this.name = 'TopicNotFoundError';
  }
}

export class MockTopicRepository implements TopicRepository {
  private readonly store: MockJournalStore;

  constructor(store: MockJournalStore);
  constructor(data: TopicRepositoryData, options: MockTopicRepositoryOptions);
  constructor(
    storeOrData: MockJournalStore | TopicRepositoryData,
    options?: MockTopicRepositoryOptions,
  ) {
    this.store =
      storeOrData instanceof MockJournalStore
        ? storeOrData
        : new MockJournalStore(
            storeOrData,
            options ?? { user_id: '00000000-0000-4000-8000-000000000001' },
          );
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async listTopics(): Promise<TopicListItem[]> {
    return buildTopicListItems(this.store.snapshot(), this.store.userId);
  }

  async getTopicDetail(topicId: UUID): Promise<TopicDetail | null> {
    return buildTopicDetail(this.store.snapshot(), this.store.userId, topicId);
  }

  async createTopic(input: TopicFormValues): Promise<Topic> {
    const values = topicFormSchema.parse(input);
    const now = this.store.now();
    const topic: Topic = {
      id: this.store.createId('topic'),
      user_id: this.store.userId,
      title: values.name,
      description: values.description.length > 0 ? values.description : null,
      icon: values.icon,
      is_pinned: values.isPinned,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };

    this.store.mutate((data) => {
      data.topics.push(topic);
    });

    return topic;
  }

  async updateTopic(topicId: UUID, input: TopicFormValues): Promise<Topic> {
    const values = topicFormSchema.parse(input);
    const data = this.store.snapshot();
    const currentTopic = data.topics.find(
      (topic) =>
        topic.id === topicId && topic.user_id === this.store.userId && topic.archived_at === null,
    );

    if (!currentTopic) {
      throw new TopicNotFoundError();
    }

    const updatedTopic: Topic = {
      ...currentTopic,
      title: values.name,
      description: values.description.length > 0 ? values.description : null,
      icon: values.icon,
      is_pinned: values.isPinned,
      updated_at: this.store.now(),
    };

    this.store.mutate((mutableData) => {
      const topicIndex = mutableData.topics.findIndex((topic) => topic.id === topicId);

      if (topicIndex >= 0) {
        mutableData.topics[topicIndex] = updatedTopic;
      }
    });

    return updatedTopic;
  }

  async deleteTopic(topicId: UUID): Promise<TopicDeletionSummary> {
    const data = this.store.snapshot();
    const deletionSummary = buildTopicDeletionSummary(data, this.store.userId, topicId);

    if (!deletionSummary) {
      throw new TopicNotFoundError();
    }

    const removedQuestionIds = new Set(
      data.question_templates
        .filter(
          (question) => question.user_id === this.store.userId && question.topic_id === topicId,
        )
        .map((question) => question.id),
    );
    const removedReadingIds = new Set(
      data.readings
        .filter((reading) => reading.user_id === this.store.userId && reading.topic_id === topicId)
        .map((reading) => reading.id),
    );

    this.store.mutate((mutableData) => {
      mutableData.topics = mutableData.topics.filter(
        (topic) => !(topic.id === topicId && topic.user_id === this.store.userId),
      );
      mutableData.question_templates = mutableData.question_templates.filter(
        (question) => !removedQuestionIds.has(question.id),
      );
      mutableData.question_template_positions = mutableData.question_template_positions.filter(
        (position) => !removedQuestionIds.has(position.question_template_id),
      );
      mutableData.readings = mutableData.readings.filter(
        (reading) => !removedReadingIds.has(reading.id),
      );
      mutableData.reading_cards = mutableData.reading_cards.filter(
        (card) => !removedReadingIds.has(card.reading_id),
      );
    });

    return deletionSummary;
  }
}

export const topicRepository = new MockTopicRepository(mockJournalStore);
