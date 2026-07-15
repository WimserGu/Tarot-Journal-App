import type { QuestionFrequency, QuestionTemplate, UUID } from '@/domain/types';
import {
  questionTemplateInputSchema,
  type QuestionTemplateRepository,
} from './questionTemplateRepository';

export type SaveTodayQuestionInput = {
  frequency: Extract<QuestionFrequency, 'daily' | 'weekly'>;
  questionText: string;
  topicId: UUID;
  template?: QuestionTemplate;
};

export async function saveTodayQuestion(
  repository: QuestionTemplateRepository,
  input: SaveTodayQuestionInput,
): Promise<QuestionTemplate> {
  const duplicate = await repository.findDuplicateQuestionTemplate({
    topic_id: input.topicId,
    question_text: input.questionText,
    exclude_id: input.template?.id,
  });
  if (duplicate) throw new Error('这个 Topic 中已经有相同的固定问题。');

  const existingDetail = input.template
    ? await repository.getQuestionTemplate(input.template.id)
    : null;
  if (input.template && !existingDetail) throw new Error('找不到要修改的固定问题。');

  const values = questionTemplateInputSchema.parse({
    topic_id: input.topicId,
    question_text: input.questionText,
    frequency: input.frequency,
    is_active: existingDetail?.question_template.is_active ?? true,
    is_pinned: existingDetail?.question_template.is_pinned ?? false,
    position_names: existingDetail?.positions.map((position) => position.position_name) ?? [],
  });

  return input.template
    ? repository.updateQuestionTemplate(input.template.id, values)
    : repository.createQuestionTemplate(values);
}
