import { describe, expect, it } from 'vitest';

import {
  DEMO_USER_ID,
  MOCK_QUESTION_IDS,
  MOCK_TOPIC_IDS,
  mockQuestionTemplatePositions,
  mockQuestionTemplates,
  mockReadingCards,
  mockReadings,
  mockTopics,
} from '../../../domain/mockData';
import { tarotCards } from '../../../domain/tarotCards';
import { MockJournalStore } from '../../../repositories/mockJournalStore';
import { MockTopicRepository } from '../../topics/mockTopicRepository';
import { buildInitialReadingFormValues } from '../readingFormState';
import { MockReadingRepository } from '../mockReadingRepository';
import { ReadingValidationError } from '../readingRepository';

function createStore() {
  let id = 0;

  return new MockJournalStore(
    {
      topics: mockTopics,
      question_templates: mockQuestionTemplates,
      question_template_positions: mockQuestionTemplatePositions,
      readings: mockReadings,
      reading_cards: mockReadingCards,
      reading_follow_ups: [],
      tarot_cards: tarotCards,
    },
    {
      user_id: DEMO_USER_ID,
      now: () => '2026-07-12T09:00:00.000Z',
      create_id: (entity) => `${entity}-${++id}`,
    },
  );
}

describe('MockReadingRepository', () => {
  it('prefills a fixed question with its saved default positions', async () => {
    const repository = new MockReadingRepository(createStore());
    const context = await repository.getReadingFormContext();
    const values = buildInitialReadingFormValues(
      context,
      { question_template_id: MOCK_QUESTION_IDS.thesisProgress },
      new Date('2026-07-10T08:30:00.000Z'),
      'Africa/Nairobi',
    );

    expect(values.topic_id).toBe(MOCK_TOPIC_IDS.thesis);
    expect(values.question_mode).toBe('template');
    expect(values.cards.map((card) => card.position_name)).toEqual(['现状', '阻碍', '建议']);
  });

  it('persists a completed reading with the fixed-question text snapshot and ordered cards', async () => {
    const store = createStore();
    const repository = new MockReadingRepository(store);
    const topicRepository = new MockTopicRepository(store);
    const reading = await repository.createReading({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
      temporary_question: null,
      reading_at: '2026-07-12T08:30:00.000Z',
      reading_timezone: 'Africa/Nairobi',
      interpretation: '先写出一个可交付版本。',
      status: 'completed',
      cards: [
        { tarot_card_id: 57, position_name: '阻碍', orientation: 'reversed', position_order: 1 },
        { tarot_card_id: 71, position_name: '建议', orientation: 'upright', position_order: 2 },
      ],
    });
    const detail = await repository.getReadingDetail(reading.id);
    const topicDetail = await topicRepository.getTopicDetail(MOCK_TOPIC_IDS.thesis);

    expect(reading.question_text_snapshot).toBe('今天最值得优先处理的阻碍是什么？');
    expect(detail?.cards.map((card) => card.reading_card.position_order)).toEqual([1, 2]);
    expect(detail?.cards.map((card) => card.tarot_card?.card_key)).toEqual([
      'swords_eight',
      'pentacles_eight',
    ]);
    expect(topicDetail?.record_count).toBe(4);
  });

  it('allows an empty-card draft with a temporary question', async () => {
    const repository = new MockReadingRepository(createStore());
    const reading = await repository.createReading({
      topic_id: MOCK_TOPIC_IDS.relationship,
      question_template_id: null,
      temporary_question: '我想先厘清什么感受？',
      reading_at: '2026-07-12T09:00:00.000Z',
      reading_timezone: 'Africa/Nairobi',
      interpretation: null,
      status: 'draft',
      cards: [],
    });

    expect(reading.status).toBe('draft');
    expect(reading.question_text_snapshot).toBe('我想先厘清什么感受？');
  });

  it('rejects an incomplete completed reading and non-continuous card order', async () => {
    const repository = new MockReadingRepository(createStore());

    await expect(
      repository.createReading({
        topic_id: MOCK_TOPIC_IDS.thesis,
        question_template_id: null,
        temporary_question: '今天应该先做什么？',
        reading_at: '2026-07-12T09:00:00.000Z',
        reading_timezone: 'Africa/Nairobi',
        interpretation: null,
        status: 'completed',
        cards: [],
      }),
    ).rejects.toBeInstanceOf(ReadingValidationError);

    await expect(
      repository.createReading({
        topic_id: MOCK_TOPIC_IDS.thesis,
        question_template_id: null,
        temporary_question: '今天应该先做什么？',
        reading_at: '2026-07-12T09:00:00.000Z',
        reading_timezone: 'Africa/Nairobi',
        interpretation: null,
        status: 'draft',
        cards: [
          { tarot_card_id: null, position_name: '现状', orientation: 'upright', position_order: 1 },
          { tarot_card_id: null, position_name: '阻碍', orientation: 'upright', position_order: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(ReadingValidationError);
  });
});
