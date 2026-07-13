import type { QuestionTemplate } from '../../domain/types';

import type { ReadingDetail, ReadingFormContext } from './readingRepository';
import { createEmptyReadingCard, getDateTimeFields, type ReadingFormValues } from './readingSchema';

export type ReadingPrefill = {
  topic_id?: string;
  question_template_id?: string;
  temporary_question?: string;
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
        reversalExpression: null,
        source: 'manual' as const,
        drawSessionId: null,
        spreadPositionId: `open.card.${position.position_order}`,
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
  const temporaryQuestion = prefill.temporary_question?.trim() ?? '';
  const { reading_date: readingDate, reading_time: readingTime } = getDateTimeFields(now, timeZone);

  return {
    spread_id: 'open',
    topic_id: topicIdFromTemplate ?? (hasPrefilledTopic ? (prefill.topic_id ?? '') : ''),
    question_mode: temporaryQuestion.length > 0 ? 'temporary' : template ? 'template' : 'temporary',
    question_template_id: temporaryQuestion.length > 0 ? null : (template?.id ?? null),
    temporary_question: temporaryQuestion,
    reading_date: readingDate,
    reading_time: readingTime,
    cards: getTemplateCards(context, template),
    interpretation: '',
  };
}

export function buildReadingFormValuesFromDetail(
  context: ReadingFormContext,
  detail: ReadingDetail,
): ReadingFormValues {
  const templateIsAvailable =
    detail.question_template !== null &&
    context.question_templates.some((template) => template.id === detail.question_template?.id);
  const { reading_date: readingDate, reading_time: readingTime } = getDateTimeFields(
    new Date(detail.reading.reading_at),
    detail.reading.reading_timezone,
  );

  return {
    spread_id: detail.reading.spread_id,
    topic_id: detail.topic.id,
    question_mode: templateIsAvailable ? 'template' : 'temporary',
    question_template_id: templateIsAvailable ? (detail.question_template?.id ?? null) : null,
    temporary_question: templateIsAvailable ? '' : detail.question_text,
    reading_date: readingDate,
    reading_time: readingTime,
    cards:
      detail.cards.length > 0
        ? detail.cards.map(({ reading_card: card }) => ({
            tarot_card_id: card.tarot_card_id,
            position_name: card.position_name ?? '',
            orientation: card.orientation,
            reversalExpression: card.reversalExpression,
            source: card.source,
            drawSessionId: card.drawSessionId,
            spreadPositionId: card.spreadPositionId,
          }))
        : [{ ...createEmptyReadingCard(), spreadPositionId: null }],
    interpretation: detail.reading.interpretation ?? '',
  };
}

export function getDefaultCardsForTemplate(context: ReadingFormContext, templateId: string | null) {
  const template = templateId
    ? context.question_templates.find((candidate) => candidate.id === templateId)
    : undefined;

  return getTemplateCards(context, template);
}
