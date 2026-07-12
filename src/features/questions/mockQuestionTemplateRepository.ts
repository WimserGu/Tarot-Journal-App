import type { QuestionTemplate, QuestionTemplatePosition, UUID } from '../../domain/types';
import { JournalStore, journalStore } from '../../repositories/mockJournalStore';

import {
  questionTemplateInputSchema,
  QuestionTemplateNotFoundError,
  type QuestionTemplateDetail,
  type QuestionTemplateInput,
  type QuestionTemplateRepository,
} from './questionTemplateRepository';

export class MockQuestionTemplateRepository implements QuestionTemplateRepository {
  constructor(private readonly store: JournalStore) {}

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async listQuestionTemplates(topicId: UUID): Promise<QuestionTemplate[]> {
    await this.store.ready();
    return this.store
      .snapshot()
      .question_templates.filter(
        (template) => template.user_id === this.store.userId && template.topic_id === topicId,
      )
      .sort((first, second) => first.displayOrder - second.displayOrder);
  }

  async findDuplicateQuestionTemplate(
    query: import('./questionTemplateRepository').QuestionTemplateDuplicateQuery,
  ): Promise<QuestionTemplate | null> {
    await this.store.ready();
    const normalized = query.question_text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
    return (
      this.store
        .snapshot()
        .question_templates.find(
          (template) =>
            template.user_id === this.store.userId &&
            template.topic_id === query.topic_id &&
            template.id !== query.exclude_id &&
            template.question_text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN') ===
              normalized,
        ) ?? null
    );
  }

  async setQuestionTemplateActive(
    questionTemplateId: UUID,
    isActive: boolean,
  ): Promise<QuestionTemplate> {
    const current = await this.getQuestionTemplate(questionTemplateId);
    if (!current) throw new QuestionTemplateNotFoundError();
    return this.updateQuestionTemplate(questionTemplateId, {
      ...current.question_template,
      is_active: isActive,
      position_names: current.positions.map((position) => position.position_name),
    });
  }

  async reorderQuestionTemplates(
    topicId: UUID,
    questionTemplateIds: UUID[],
  ): Promise<QuestionTemplate[]> {
    const templates = await this.listQuestionTemplates(topicId);
    if (
      templates.length !== questionTemplateIds.length ||
      new Set(questionTemplateIds).size !== questionTemplateIds.length ||
      questionTemplateIds.some((id) => !templates.some((template) => template.id === id))
    )
      throw new QuestionTemplateNotFoundError();
    const now = this.store.now();
    await this.store.mutate((data) => {
      questionTemplateIds.forEach((id, index) => {
        const templateIndex = data.question_templates.findIndex((template) => template.id === id);
        const currentTemplate = data.question_templates[templateIndex];
        if (!currentTemplate) throw new QuestionTemplateNotFoundError();
        data.question_templates[templateIndex] = {
          ...currentTemplate,
          displayOrder: index + 1,
          updated_at: now,
        };
      });
    });
    return this.listQuestionTemplates(topicId);
  }

  async getQuestionTemplate(questionTemplateId: UUID): Promise<QuestionTemplateDetail | null> {
    await this.store.ready();
    const template = this.store
      .snapshot()
      .question_templates.find(
        (candidate) =>
          candidate.id === questionTemplateId && candidate.user_id === this.store.userId,
      );
    if (!template) return null;
    return {
      question_template: template,
      positions: this.store
        .snapshot()
        .question_template_positions.filter(
          (position) =>
            position.question_template_id === template.id && position.user_id === this.store.userId,
        )
        .sort((first, second) => first.position_order - second.position_order),
    };
  }

  async createQuestionTemplate(input: QuestionTemplateInput): Promise<QuestionTemplate> {
    await this.store.ready();
    const values = questionTemplateInputSchema.parse(input);
    const topic = this.store
      .snapshot()
      .topics.find(
        (candidate) =>
          candidate.id === values.topic_id &&
          candidate.user_id === this.store.userId &&
          candidate.archived_at === null,
      );
    if (!topic) throw new QuestionTemplateNotFoundError();
    const now = this.store.now();
    const questionTemplate: QuestionTemplate = {
      id: this.store.createId('question-template'),
      user_id: this.store.userId,
      topic_id: values.topic_id,
      question_text: values.question_text,
      frequency: values.frequency,
      is_active: values.is_active,
      is_pinned: values.is_pinned,
      displayOrder:
        Math.max(
          0,
          ...this.store
            .snapshot()
            .question_templates.filter(
              (template) =>
                template.topic_id === values.topic_id && template.user_id === this.store.userId,
            )
            .map((template) => template.displayOrder),
        ) + 1,
      created_at: now,
      updated_at: now,
    };
    const positions = this.buildPositions(questionTemplate.id, values.position_names, now);
    await this.store.mutate((data) => {
      data.question_templates.push(questionTemplate);
      data.question_template_positions.push(...positions);
    });
    return questionTemplate;
  }

  async updateQuestionTemplate(
    questionTemplateId: UUID,
    input: QuestionTemplateInput,
  ): Promise<QuestionTemplate> {
    await this.store.ready();
    const values = questionTemplateInputSchema.parse(input);
    const current = this.store
      .snapshot()
      .question_templates.find(
        (template) => template.id === questionTemplateId && template.user_id === this.store.userId,
      );
    if (!current) throw new QuestionTemplateNotFoundError();
    const now = this.store.now();
    const updated: QuestionTemplate = { ...current, ...values, updated_at: now };
    const positions = this.buildPositions(questionTemplateId, values.position_names, now);
    await this.store.mutate((data) => {
      const index = data.question_templates.findIndex(
        (template) => template.id === questionTemplateId,
      );
      data.question_templates[index] = updated;
      data.question_template_positions = data.question_template_positions.filter(
        (position) => position.question_template_id !== questionTemplateId,
      );
      data.question_template_positions.push(...positions);
    });
    return updated;
  }

  async deleteQuestionTemplate(questionTemplateId: UUID): Promise<void> {
    const current = await this.getQuestionTemplate(questionTemplateId);
    if (!current) throw new QuestionTemplateNotFoundError();
    await this.store.mutate((data) => {
      data.question_templates = data.question_templates.filter(
        (template) => template.id !== questionTemplateId,
      );
      data.question_template_positions = data.question_template_positions.filter(
        (position) => position.question_template_id !== questionTemplateId,
      );
      data.question_templates
        .filter((template) => template.topic_id === current.question_template.topic_id)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .forEach((template, index) => {
          template.displayOrder = index + 1;
        });
    });
  }

  private buildPositions(
    questionTemplateId: UUID,
    names: readonly string[],
    now: string,
  ): QuestionTemplatePosition[] {
    return names.map((positionName, index) => ({
      id: this.store.createId('question-template-position'),
      user_id: this.store.userId,
      question_template_id: questionTemplateId,
      position_order: index + 1,
      position_name: positionName,
      created_at: now,
      updated_at: now,
    }));
  }
}

export const questionTemplateRepository = new MockQuestionTemplateRepository(journalStore);
