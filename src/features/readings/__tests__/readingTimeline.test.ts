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
import { MockReadingRepository } from '../mockReadingRepository';

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

const topicTimeline = (repository: MockReadingRepository, filters = {}) =>
  repository.getTopicTimeline({ topic_id: MOCK_TOPIC_IDS.thesis, ...filters });

describe('Reading timeline and question history', () => {
  it('sorts the topic timeline by Reading date descending', async () => {
    const timeline = await topicTimeline(new MockReadingRepository(createStore()));

    expect(timeline.map((item) => item.reading.id)).toEqual([
      mockReadings[0]!.id,
      mockReadings[1]!.id,
      mockReadings[2]!.id,
    ]);
  });

  it('applies a single fixed-question filter', async () => {
    const timeline = await topicTimeline(new MockReadingRepository(createStore()), {
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
    });

    expect(timeline).toHaveLength(2);
    expect(
      timeline.every(
        (item) => item.reading.question_template_id === MOCK_QUESTION_IDS.thesisObstacle,
      ),
    ).toBe(true);
  });

  it('combines card name, orientation, date, and favorite filters', async () => {
    const timeline = await topicTimeline(new MockReadingRepository(createStore()), {
      card_query: 'eight of pentacles',
      orientation: 'upright',
      date_from: '2026-07-10',
      date_to: '2026-07-10',
      is_favorite: true,
    });

    expect(timeline.map((item) => item.reading.id)).toEqual([mockReadings[0]!.id]);
  });

  it('clears all filters by querying the topic without optional conditions', async () => {
    const repository = new MockReadingRepository(createStore());
    const filtered = await topicTimeline(repository, { is_favorite: true });
    const cleared = await topicTimeline(repository);

    expect(filtered).toHaveLength(1);
    expect(cleared).toHaveLength(3);
  });

  it('matches a fixed question across its historical snapshots', async () => {
    const history = await new MockReadingRepository(createStore()).getQuestionHistory({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
    });

    expect(history?.total_reading_count).toBe(2);
    expect(
      history?.records.every(
        (record) => record.reading.question_template_id === MOCK_QUESTION_IDS.thesisObstacle,
      ),
    ).toBe(true);
    expect(history?.earliest_reading_at).toBe(mockReadings[1]!.reading_at);
    expect(history?.latest_reading_at).toBe(mockReadings[0]!.reading_at);
  });

  it('calculates new and disappeared cards from two real records', async () => {
    const history = await new MockReadingRepository(createStore()).getQuestionHistory({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
    });

    expect(history?.comparison?.new_cards.map((card) => card.card_key)).toEqual([
      'swords_eight',
      'pentacles_eight',
    ]);
    expect(history?.comparison?.disappeared_cards.map((card) => card.card_key)).toEqual([
      'major_sun',
    ]);
  });

  it('calculates repeated cards and orientation changes', async () => {
    const repository = new MockReadingRepository(createStore());
    await repository.updateReading(mockReadings[1]!.id, {
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
      temporary_question: null,
      reading_at: mockReadings[1]!.reading_at,
      reading_timezone: mockReadings[1]!.reading_timezone,
      interpretation: null,
      status: 'completed',
      cards: [
        { tarot_card_id: 71, position_name: null, orientation: 'reversed', position_order: 1 },
      ],
    });

    const history = await repository.getQuestionHistory({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
    });

    expect(history?.comparison?.repeated_cards.map((card) => card.card_key)).toEqual([
      'pentacles_eight',
    ]);
    expect(history?.comparison?.orientation_changes).toEqual([
      expect.objectContaining({
        tarot_card: expect.objectContaining({ card_key: 'pentacles_eight' }),
        previous_orientation: 'reversed',
        current_orientation: 'upright',
      }),
    ]);
  });

  it('reports insufficient comparison data for a question with only one record', async () => {
    const history = await new MockReadingRepository(createStore()).getQuestionHistory({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_template_id: MOCK_QUESTION_IDS.thesisProgress,
    });

    expect(history?.total_reading_count).toBe(1);
    expect(history?.comparison).toBeNull();
  });

  it('returns an empty history for an existing question with no records', async () => {
    const store = createStore();
    store.mutate((data) => {
      data.readings = data.readings.filter(
        (reading) => reading.question_template_id !== MOCK_QUESTION_IDS.relationshipCommunication,
      );
    });
    const history = await new MockReadingRepository(store).getQuestionHistory({
      topic_id: MOCK_TOPIC_IDS.relationship,
      question_template_id: MOCK_QUESTION_IDS.relationshipCommunication,
    });

    expect(history?.total_reading_count).toBe(0);
    expect(history?.records).toEqual([]);
    expect(history?.comparison).toBeNull();
  });
});
