import type { Topic, UUID } from '../../domain/types';
import {
  JournalStore,
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
  TopicNotFoundError,
} from './topicRepository';

export type MockTopicRepositoryOptions = MockJournalStoreOptions;

export { TopicNotFoundError } from './topicRepository';

export class MockTopicRepository implements TopicRepository {
  private readonly store: JournalStore;

  constructor(store: JournalStore);
  constructor(data: TopicRepositoryData, options: MockTopicRepositoryOptions);
  constructor(
    storeOrData: JournalStore | TopicRepositoryData,
    options?: MockTopicRepositoryOptions,
  ) {
    this.store =
      storeOrData instanceof JournalStore
        ? storeOrData
        : new JournalStore(
            storeOrData,
            options ?? { user_id: '00000000-0000-4000-8000-000000000001' },
          );
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async listTopics(): Promise<TopicListItem[]> {
    await this.store.ready();
    return buildTopicListItems(this.store.snapshot(), this.store.userId);
  }

  async getTopicDetail(topicId: UUID): Promise<TopicDetail | null> {
    await this.store.ready();
    return buildTopicDetail(this.store.snapshot(), this.store.userId, topicId);
  }

  async createTopic(input: TopicFormValues): Promise<Topic> {
    await this.store.ready();
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

    await this.store.mutate((data) => {
      data.topics.push(topic);
    });

    return topic;
  }

  async updateTopic(topicId: UUID, input: TopicFormValues): Promise<Topic> {
    await this.store.ready();
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

    await this.store.mutate((mutableData) => {
      const topicIndex = mutableData.topics.findIndex((topic) => topic.id === topicId);

      if (topicIndex >= 0) {
        mutableData.topics[topicIndex] = updatedTopic;
      }
    });

    return updatedTopic;
  }

  async deleteTopic(topicId: UUID): Promise<TopicDeletionSummary> {
    await this.store.ready();
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

    await this.store.mutate((mutableData) => {
      mutableData.topics = mutableData.topics.filter(
        (topic) => !(topic.id === topicId && topic.user_id === this.store.userId),
      );
      mutableData.question_templates = mutableData.question_templates.filter(
        (question) => !removedQuestionIds.has(question.id),
      );
      mutableData.question_tags = mutableData.question_tags.filter(
        (tag) => !(tag.topic_id === topicId && tag.user_id === this.store.userId),
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
