import { describe, expect, it } from 'vitest';

import {
  createEmptyReadingCard,
  getCompletedCardsError,
  readingFormSchema,
  toReadingCreateInput,
} from '../readingSchema';

describe('readingFormSchema', () => {
  it('requires text for a temporary question', () => {
    const result = readingFormSchema.safeParse({
      topic_id: 'topic-id',
      question_mode: 'temporary',
      question_template_id: null,
      temporary_question: '   ',
      reading_date: '2026-07-10',
      reading_time: '08:30',
      cards: [],
      interpretation: '',
    });

    expect(result.success).toBe(false);
  });

  it('allows a draft with no cards but keeps formal-card validation separate', () => {
    expect(getCompletedCardsError([])).toBe('正式记录至少需要一张牌。');
    expect(getCompletedCardsError([createEmptyReadingCard()])).toBe('正式记录至少需要一张牌。');
  });

  it('normalizes visible card order into continuous persistence order', () => {
    const input = toReadingCreateInput(
      {
        topic_id: 'topic-id',
        question_mode: 'temporary',
        question_template_id: null,
        temporary_question: '今天应该先关注什么？',
        reading_date: '2026-07-10',
        reading_time: '08:30',
        cards: [
          { tarot_card_id: 71, position_name: '现状', orientation: 'upright' },
          { tarot_card_id: 57, position_name: '阻碍', orientation: 'reversed' },
          createEmptyReadingCard(),
        ],
        interpretation: '  先缩小范围。  ',
      },
      'completed',
      'Africa/Nairobi',
    );

    expect(input.cards).toEqual([
      { tarot_card_id: 71, position_name: '现状', orientation: 'upright', position_order: 1 },
      { tarot_card_id: 57, position_name: '阻碍', orientation: 'reversed', position_order: 2 },
    ]);
    expect(input.interpretation).toBe('先缩小范围。');
  });
});
