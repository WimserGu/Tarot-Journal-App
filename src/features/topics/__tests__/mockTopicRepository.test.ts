import { describe, expect, it } from 'vitest';

import {
  DEMO_USER_ID,
  MOCK_TOPIC_IDS,
  mockQuestionTemplatePositions,
  mockQuestionTemplates,
  mockReadingCards,
  mockReadings,
  mockTopics,
} from '../../../domain/mockData';
import { tarotCards } from '../../../domain/tarotCards';
import type { Topic } from '../../../domain/types';

import { MockTopicRepository, TopicNotFoundError } from '../mockTopicRepository';
import type { TopicRepositoryData } from '../topicRepository';
import type { TopicFormValues } from '../topicSchema';

const currentTime = '2026-07-12T09:00:00.000Z';

function createRepository(data: Partial<TopicRepositoryData> = {}) {
  return new MockTopicRepository(
    {
      topics: data.topics ?? mockTopics,
      question_templates: data.question_templates ?? mockQuestionTemplates,
      question_template_positions:
        data.question_template_positions ?? mockQuestionTemplatePositions,
      readings: data.readings ?? mockReadings,
      reading_cards: data.reading_cards ?? mockReadingCards,
      tarot_cards: data.tarot_cards ?? tarotCards,
    },
    {
      user_id: DEMO_USER_ID,
      now: () => currentTime,
      create_id: () => '10000000-0000-4000-8000-000000000099',
    },
  );
}

describe('MockTopicRepository', () => {
  it('lists active topics and builds detail statistics from the mock records', async () => {
    const repository = createRepository();
    const topics = await repository.listTopics();
    const thesis = await repository.getTopicDetail(MOCK_TOPIC_IDS.thesis);

    expect(topics.map((item) => item.topic.id)).toEqual([
      MOCK_TOPIC_IDS.thesis,
      MOCK_TOPIC_IDS.career,
      MOCK_TOPIC_IDS.relationship,
    ]);
    expect(thesis).not.toBeNull();

    if (!thesis) {
      throw new Error('Expected the thesis topic detail.');
    }

    expect(thesis.record_count).toBe(3);
    expect(thesis.fixed_questions).toHaveLength(2);
    expect(thesis.recent_readings[0]?.reading.id).toBe(mockReadings[0]?.id);
    expect(thesis.most_frequent_cards).toEqual([
      expect.objectContaining({
        occurrence_count: 2,
        tarot_card: expect.objectContaining({ card_key: 'pentacles_eight' }),
      }),
    ]);
  });

  it('creates and edits a topic using validated form values', async () => {
    const repository = createRepository();
    const createValues: TopicFormValues = {
      name: '  内在探索  ',
      description: '  记录反思。  ',
      icon: 'moon',
      isPinned: false,
    };
    const createdTopic = await repository.createTopic(createValues);
    const updatedTopic = await repository.updateTopic(createdTopic.id, {
      name: '内在探索',
      description: '',
      icon: 'sparkles',
      isPinned: true,
    });

    expect(createdTopic).toMatchObject({
      title: '内在探索',
      description: '记录反思。',
      icon: 'moon',
      created_at: currentTime,
    });
    expect(updatedTopic).toMatchObject({
      title: '内在探索',
      description: null,
      icon: 'sparkles',
      is_pinned: true,
      updated_at: currentTime,
    });
  });

  it('deletes the topic and its related mock questions, records, and cards', async () => {
    const repository = createRepository();
    const deletionSummary = await repository.deleteTopic(MOCK_TOPIC_IDS.thesis);

    expect(deletionSummary).toMatchObject({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_count: 2,
      reading_count: 3,
      reading_card_count: 6,
    });
    expect(await repository.getTopicDetail(MOCK_TOPIC_IDS.thesis)).toBeNull();
    expect((await repository.listTopics()).map((item) => item.topic.id)).not.toContain(
      MOCK_TOPIC_IDS.thesis,
    );
    expect(await repository.getTopicDetail(MOCK_TOPIC_IDS.relationship)).not.toBeNull();
  });

  it('keeps another users topic outside the local users repository scope', async () => {
    const otherUsersTopic: Topic = {
      ...mockTopics[0]!,
      id: '10000000-0000-4000-8000-000000000099',
      user_id: '00000000-0000-4000-8000-000000000099',
    };
    const repository = createRepository({ topics: [...mockTopics, otherUsersTopic] });

    expect((await repository.listTopics()).map((item) => item.topic.id)).not.toContain(
      otherUsersTopic.id,
    );
    await expect(repository.deleteTopic(otherUsersTopic.id)).rejects.toBeInstanceOf(
      TopicNotFoundError,
    );
  });
});
