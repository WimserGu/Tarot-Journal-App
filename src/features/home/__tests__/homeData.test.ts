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
      last_card: {
        card_key: 'pentacles_eight',
        orientation: 'upright',
      },
    });
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
  });
});
