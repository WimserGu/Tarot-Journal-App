import type {
  QuestionTemplate,
  QuestionTemplatePosition,
  QuestionTag,
  Reading,
  ReadingCard,
  TarotCard,
  Topic,
} from '../domain/types';
import type { DrawSession } from '../features/draw/drawTypes';

export type JournalData = {
  topics: readonly Topic[];
  question_templates: readonly QuestionTemplate[];
  question_template_positions: readonly QuestionTemplatePosition[];
  question_tags?: readonly QuestionTag[];
  readings: readonly Reading[];
  reading_cards: readonly ReadingCard[];
  reading_follow_ups: readonly import('../domain/types').ReadingFollowUp[];
  draw_sessions?: readonly DrawSession[];
  tarot_cards: readonly TarotCard[];
};

export type MutableJournalData = {
  topics: Topic[];
  question_templates: QuestionTemplate[];
  question_template_positions: QuestionTemplatePosition[];
  question_tags: QuestionTag[];
  readings: Reading[];
  reading_cards: ReadingCard[];
  reading_follow_ups: import('../domain/types').ReadingFollowUp[];
  draw_sessions: DrawSession[];
  tarot_cards: TarotCard[];
};
