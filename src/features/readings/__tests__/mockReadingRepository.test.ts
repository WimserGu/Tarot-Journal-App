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
import { MockQuestionTagRepository } from '../../questionTags/mockQuestionTagRepository';
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
  it('assigns one Topic-scoped question tag to multiple readings', async () => {
    const store = createStore();
    const readings = new MockReadingRepository(store);
    const tags = new MockQuestionTagRepository(store);
    const tag = await tags.createOrReuseQuestionTag({
      topic_id: MOCK_TOPIC_IDS.relationship,
      name: '沟通',
    });
    const sourceReading = store
      .snapshot()
      .readings.find((reading) => reading.topic_id === MOCK_TOPIC_IDS.relationship)!;
    await store.mutate((data) => {
      data.readings.push({ ...sourceReading, id: 'batch-reading-2' });
    });
    const selected = store
      .snapshot()
      .readings.filter((reading) => reading.topic_id === MOCK_TOPIC_IDS.relationship)
      .slice(0, 2);

    await readings.assignQuestionTag({
      topic_id: MOCK_TOPIC_IDS.relationship,
      question_tag_id: tag.id,
      reading_ids: selected.map((reading) => reading.id),
    });

    expect(
      store
        .snapshot()
        .readings.filter((reading) => selected.some((item) => item.id === reading.id))
        .map((reading) => reading.question_tag_id),
    ).toEqual([tag.id, tag.id]);
    const otherTopicReading = store
      .snapshot()
      .readings.find((reading) => reading.topic_id === MOCK_TOPIC_IDS.thesis)!;
    await expect(
      readings.assignQuestionTag({
        topic_id: MOCK_TOPIC_IDS.relationship,
        question_tag_id: tag.id,
        reading_ids: [otherTopicReading.id],
      }),
    ).rejects.toThrow('当前 Topic');
  });

  it('persists a tag from the same Topic and rejects a cross-Topic tag', async () => {
    const store = createStore();
    const readings = new MockReadingRepository(store);
    const tags = new MockQuestionTagRepository(store);
    const tag = await tags.createOrReuseQuestionTag({
      topic_id: MOCK_TOPIC_IDS.relationship,
      name: '对方的想法',
    });
    const input = {
      topic_id: MOCK_TOPIC_IDS.relationship,
      question_template_id: null,
      question_tag_id: tag.id,
      temporary_question: '她想说什么？',
      reading_at: '2026-07-12T08:30:00.000Z',
      reading_timezone: 'Africa/Nairobi',
      interpretation: null,
      status: 'completed' as const,
      cards: [
        {
          tarot_card_id: 0,
          position_name: null,
          orientation: 'upright' as const,
          position_order: 1,
        },
      ],
    };

    const reading = await readings.createReading(input);
    expect((await readings.getReadingDetail(reading.id))?.question_tag?.name).toBe('对方的想法');
    await expect(
      readings.createReading({ ...input, topic_id: MOCK_TOPIC_IDS.thesis }),
    ).rejects.toThrow('选择的问题标签不属于当前 Topic');
  });

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
        {
          tarot_card_id: 57,
          position_name: '阻碍',
          orientation: 'reversed',
          position_order: 1,
          reversalVariant: 'left',
          source: 'drawn',
          drawSessionId: '40000000-0000-4000-8000-000000000009',
        },
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
    expect(detail?.cards[0]?.reading_card).toMatchObject({
      source: 'drawn',
      reversalVariant: 'left',
      drawSessionId: '40000000-0000-4000-8000-000000000009',
    });
    expect(detail?.cards[1]?.reading_card).toMatchObject({
      source: 'manual',
      reversalVariant: null,
      drawSessionId: null,
    });
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
