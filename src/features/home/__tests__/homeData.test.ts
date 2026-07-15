import { describe, expect, it } from 'vitest';

import {
  MOCK_QUESTION_IDS,
  MOCK_TOPIC_IDS,
  mockQuestionTemplates,
  mockReadingCards,
  mockReadings,
  mockTopics,
} from '../../../domain/mockData';
import { tarotCards } from '../../../domain/tarotCards';
import { buildHomeData, getTimeGreeting } from '../homeData';

const timeZone = 'Africa/Nairobi';

function buildMockHomeData(now: Date) {
  return buildHomeData({
    now,
    time_zone: timeZone,
    topics: mockTopics,
    question_templates: mockQuestionTemplates,
    readings: mockReadings,
    reading_cards: mockReadingCards,
    tarot_cards: tarotCards,
  });
}

describe('getTimeGreeting', () => {
  it('changes the greeting across the day', () => {
    expect(getTimeGreeting(new Date(2026, 6, 10, 8))).toBe('早上好');
    expect(getTimeGreeting(new Date(2026, 6, 10, 14))).toBe('下午好');
    expect(getTimeGreeting(new Date(2026, 6, 10, 20))).toBe('晚上好');
  });
});

describe('buildHomeData', () => {
  it('shows a daily question with its latest card and completion state', () => {
    const homeData = buildMockHomeData(new Date('2026-07-10T10:00:00.000Z'));
    const question = homeData.today_questions.find(
      (item) => item.question_template.id === MOCK_QUESTION_IDS.thesisObstacle,
    );

    expect(question).toMatchObject({
      is_completed_today: true,
      last_cards: [
        {
          card_key: 'pentacles_eight',
          orientation: 'upright',
        },
        {
          card_key: 'swords_eight',
          orientation: 'reversed',
        },
      ],
    });
  });

  it('shows an empty last-card placeholder model when the question has no history', () => {
    const template = mockQuestionTemplates[0];
    if (!template) throw new Error('Expected a question template fixture.');

    const homeData = buildHomeData({
      now: new Date('2026-07-10T10:00:00.000Z'),
      time_zone: timeZone,
      topics: mockTopics,
      question_templates: [
        {
          ...template,
          id: 'question-without-history',
          question_text: '今日日运如何？',
        },
      ],
      readings: mockReadings,
      reading_cards: mockReadingCards,
      tarot_cards: tarotCards,
    });

    expect(homeData.today_questions[0]).toMatchObject({
      last_reading_at: null,
      last_cards: [],
    });
  });

  it('uses every card from the latest completed reading for the exact question template', () => {
    const template = mockQuestionTemplates[0];
    const reading = mockReadings[0];
    const firstCard = mockReadingCards[0];
    const secondCard = mockReadingCards[1];
    if (!template || !reading || !firstCard || !secondCard) {
      throw new Error('Expected complete home fixtures.');
    }

    const latestReading = {
      ...reading,
      id: 'latest-exact-question-reading',
      question_template_id: template.id,
      reading_at: '2026-07-11T08:00:00.000Z',
    };
    const homeData = buildHomeData({
      now: new Date('2026-07-11T10:00:00.000Z'),
      time_zone: timeZone,
      topics: mockTopics,
      question_templates: [template],
      readings: [...mockReadings, latestReading],
      reading_cards: [
        ...mockReadingCards,
        {
          ...firstCard,
          id: 'latest-card-one',
          reading_id: latestReading.id,
          position_order: 2,
        },
        {
          ...secondCard,
          id: 'latest-card-two',
          reading_id: latestReading.id,
          position_order: 1,
        },
      ],
      tarot_cards: tarotCards,
    });

    const question = homeData.today_questions[0];
    if (!question) throw new Error('Expected a due question.');
    expect(question.last_cards).toHaveLength(2);
    expect(question.last_cards.map((card) => card.card_key)).toEqual([
      tarotCards.find((card) => card.id === secondCard.tarot_card_id)?.card_key,
      tarotCards.find((card) => card.id === firstCard.tarot_card_id)?.card_key,
    ]);
  });

  it('counts only completed readings for each active topic', () => {
    const homeData = buildMockHomeData(new Date('2026-07-10T10:00:00.000Z'));

    expect(
      homeData.topics.find((summary) => summary.topic.id === MOCK_TOPIC_IDS.thesis)?.record_count,
    ).toBe(3);
    expect(
      homeData.topics.find((summary) => summary.topic.id === MOCK_TOPIC_IDS.relationship)
        ?.record_count,
    ).toBe(1);
    expect(
      homeData.topics.find((summary) => summary.topic.id === MOCK_TOPIC_IDS.career)?.record_count,
    ).toBe(0);
  });

  it('uses the latest completed Reading for the recent journal preview', () => {
    const homeData = buildMockHomeData(new Date('2026-07-10T10:00:00.000Z'));

    expect(homeData.recent_reading).toMatchObject({
      is_today: true,
      question_text: '今天最值得优先处理的阻碍是什么？',
      reading: { id: mockReadings[0]?.id },
    });
    expect(homeData.recent_reading?.cards).toHaveLength(2);
  });

  it('includes a weekly question again after seven calendar days', () => {
    const homeData = buildMockHomeData(new Date('2026-07-15T10:00:00.000Z'));

    expect(
      homeData.today_questions.some(
        (item) => item.question_template.id === MOCK_QUESTION_IDS.thesisProgress,
      ),
    ).toBe(true);
  });

  it('returns empty collections when there are no topics or fixed questions', () => {
    const homeData = buildHomeData({
      now: new Date('2026-07-10T10:00:00.000Z'),
      time_zone: timeZone,
      topics: [],
      question_templates: [],
      readings: [],
      reading_cards: [],
      tarot_cards: tarotCards,
    });

    expect(homeData.today_questions).toEqual([]);
    expect(homeData.topics).toEqual([]);
    expect(homeData.recent_reading).toBeNull();
  });
});
