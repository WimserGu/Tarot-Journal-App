import type {
  QuestionTemplate,
  QuestionTemplatePosition,
  Reading,
  ReadingCard,
  TarotCard,
  Topic,
} from '../domain/types';

export type JournalData = {
  topics: readonly Topic[];
  question_templates: readonly QuestionTemplate[];
  question_template_positions: readonly QuestionTemplatePosition[];
  readings: readonly Reading[];
  reading_cards: readonly ReadingCard[];
  reading_follow_ups: readonly import('../domain/types').ReadingFollowUp[];
  tarot_cards: readonly TarotCard[];
};

export type MutableJournalData = {
  topics: Topic[];
  question_templates: QuestionTemplate[];
  question_template_positions: QuestionTemplatePosition[];
  readings: Reading[];
  reading_cards: ReadingCard[];
  reading_follow_ups: import('../domain/types').ReadingFollowUp[];
  tarot_cards: TarotCard[];
};
