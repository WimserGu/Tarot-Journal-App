import type { QuestionTemplate } from '../../domain/types';

import type { ReadingFormContext } from './readingRepository';
import { createEmptyReadingCard, getDateTimeFields, type ReadingFormValues } from './readingSchema';

export type ReadingPrefill = {
  topic_id?: string;
  question_template_id?: string;
};

function getTemplateCards(context: ReadingFormContext, template: QuestionTemplate | undefined) {
  if (!template) {
    return [createEmptyReadingCard()];
  }

  const positions = context.question_template_positions.filter(
    (position) => position.question_template_id === template.id,
  );

  return positions.length > 0
    ? positions.map((position) => ({
        tarot_card_id: null,
        position_name: position.position_name,
        orientation: 'upright' as const,
      }))
    : [createEmptyReadingCard()];
}

export function buildInitialReadingFormValues(
  context: ReadingFormContext,
  prefill: ReadingPrefill,
  now: Date,
  timeZone: string,
): ReadingFormValues {
  const template = prefill.question_template_id
    ? context.question_templates.find((candidate) => candidate.id === prefill.question_template_id)
    : undefined;
  const topicIdFromTemplate = template?.topic_id;
  const hasPrefilledTopic = context.topics.some((topic) => topic.id === prefill.topic_id);
  const { reading_date: readingDate, reading_time: readingTime } = getDateTimeFields(now, timeZone);

  return {
    topic_id: topicIdFromTemplate ?? (hasPrefilledTopic ? (prefill.topic_id ?? '') : ''),
    question_mode: template ? 'template' : 'temporary',
    question_template_id: template?.id ?? null,
    temporary_question: '',
    reading_date: readingDate,
    reading_time: readingTime,
    cards: getTemplateCards(context, template),
    interpretation: '',
  };
}

export function getDefaultCardsForTemplate(context: ReadingFormContext, templateId: string | null) {
  const template = templateId
    ? context.question_templates.find((candidate) => candidate.id === templateId)
    : undefined;

  return getTemplateCards(context, template);
}
