import { z } from 'zod';

import type { QuestionTag, UUID } from '../../domain/types';
import {
  NotFoundRepositoryError,
  ValidationRepositoryError,
} from '../../repositories/repositoryErrors';

export const RELATIONSHIP_QUESTION_TAG_PRESETS = [
  '对方的想法',
  '我的状态',
  '关系走向',
  '沟通',
  '行动建议',
] as const;

export type RelationshipQuestionTagPreset = (typeof RELATIONSHIP_QUESTION_TAG_PRESETS)[number];

export const questionTagNameSchema = z
  .string()
  .trim()
  .min(1, '请输入标签名称。')
  .max(40, '标签名称不能超过 40 个字符。');

export function normalizeQuestionTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
}

export type CreateQuestionTagInput = { topic_id: UUID; name: string };

export interface QuestionTagRepository {
  listQuestionTags(topicId: UUID): Promise<QuestionTag[]>;
  createOrReuseQuestionTag(input: CreateQuestionTagInput): Promise<QuestionTag>;
  deleteQuestionTag(id: UUID): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export class QuestionTagNotFoundError extends NotFoundRepositoryError {
  constructor() {
    super('未找到这个问题标签。');
    this.name = 'QuestionTagNotFoundError';
  }
}

export class QuestionTagValidationError extends ValidationRepositoryError {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionTagValidationError';
  }
}
