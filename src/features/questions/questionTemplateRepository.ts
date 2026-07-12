import { z } from 'zod';
import { NotFoundRepositoryError } from '../../repositories/repositoryErrors';

import type {
  QuestionFrequency,
  QuestionTemplate,
  QuestionTemplatePosition,
  UUID,
} from '../../domain/types';

export type QuestionTemplateInput = {
  frequency: QuestionFrequency;
  is_active: boolean;
  is_pinned: boolean;
  position_names: string[];
  question_text: string;
  topic_id: UUID;
};

export type QuestionTemplateDuplicateQuery = {
  topic_id: UUID;
  question_text: string;
  exclude_id?: UUID;
};

export type QuestionTemplateDetail = {
  positions: QuestionTemplatePosition[];
  question_template: QuestionTemplate;
};

export interface QuestionTemplateRepository {
  createQuestionTemplate(input: QuestionTemplateInput): Promise<QuestionTemplate>;
  deleteQuestionTemplate(questionTemplateId: UUID): Promise<void>;
  getQuestionTemplate(questionTemplateId: UUID): Promise<QuestionTemplateDetail | null>;
  listQuestionTemplates(topicId: UUID): Promise<QuestionTemplate[]>;
  findDuplicateQuestionTemplate(
    query: QuestionTemplateDuplicateQuery,
  ): Promise<QuestionTemplate | null>;
  setQuestionTemplateActive(questionTemplateId: UUID, isActive: boolean): Promise<QuestionTemplate>;
  reorderQuestionTemplates(topicId: UUID, questionTemplateIds: UUID[]): Promise<QuestionTemplate[]>;
  subscribe(listener: () => void): () => void;
  updateQuestionTemplate(
    questionTemplateId: UUID,
    input: QuestionTemplateInput,
  ): Promise<QuestionTemplate>;
}

export class QuestionTemplateNotFoundError extends NotFoundRepositoryError {
  constructor() {
    super('未找到这个固定问题。');
    this.name = 'QuestionTemplateNotFoundError';
  }
}

export const questionTemplateInputSchema = z.object({
  frequency: z.enum(['as_needed', 'daily', 'weekly']),
  is_active: z.boolean(),
  is_pinned: z.boolean(),
  position_names: z.array(z.string().trim().min(1).max(120)).max(20),
  question_text: z.string().trim().min(1).max(1000),
  topic_id: z.string().trim().min(1),
});
