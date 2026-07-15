import type { QuestionTag, UUID } from '../../domain/types';
import { JournalStore, mockJournalStore } from '../../repositories/mockJournalStore';
import {
  normalizeQuestionTagName,
  questionTagNameSchema,
  QuestionTagNotFoundError,
  QuestionTagValidationError,
  type CreateQuestionTagInput,
  type QuestionTagRepository,
} from './questionTagRepository';

export class MockQuestionTagRepository implements QuestionTagRepository {
  constructor(private readonly store: JournalStore) {}

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async listQuestionTags(topicId: UUID): Promise<QuestionTag[]> {
    await this.store.ready();
    return (
      this.store
        .snapshot()
        .question_tags?.filter(
          (tag) => tag.user_id === this.store.userId && tag.topic_id === topicId,
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')) ?? []
    );
  }

  async createOrReuseQuestionTag(input: CreateQuestionTagInput): Promise<QuestionTag> {
    await this.store.ready();
    const name = questionTagNameSchema.parse(input.name);
    const data = this.store.snapshot();
    const topic = data.topics.find(
      (item) =>
        item.id === input.topic_id &&
        item.user_id === this.store.userId &&
        item.archived_at === null,
    );
    if (!topic) throw new QuestionTagValidationError('请选择可用的 Topic。');
    const normalizedName = normalizeQuestionTagName(name);
    const existing = data.question_tags?.find(
      (tag) =>
        tag.user_id === this.store.userId &&
        tag.topic_id === input.topic_id &&
        tag.normalized_name === normalizedName,
    );
    if (existing) return existing;
    const now = this.store.now();
    const tag: QuestionTag = {
      id: this.store.createId('question-tag'),
      user_id: this.store.userId,
      topic_id: input.topic_id,
      name,
      normalized_name: normalizedName,
      created_at: now,
      updated_at: now,
    };
    await this.store.mutate((mutable) => mutable.question_tags.push(tag));
    return tag;
  }

  async deleteQuestionTag(id: UUID): Promise<void> {
    await this.store.ready();
    const existing = this.store
      .snapshot()
      .question_tags?.find((tag) => tag.id === id && tag.user_id === this.store.userId);
    if (!existing) throw new QuestionTagNotFoundError();
    await this.store.mutate((mutable) => {
      mutable.question_tags = mutable.question_tags.filter((tag) => tag.id !== id);
      mutable.readings.forEach((reading) => {
        if (reading.question_tag_id === id) reading.question_tag_id = null;
      });
    });
  }
}

export const questionTagRepository = new MockQuestionTagRepository(mockJournalStore);
