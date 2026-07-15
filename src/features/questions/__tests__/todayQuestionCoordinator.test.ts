import { describe, expect, it, vi } from 'vitest';
import { DEMO_USER_ID, MOCK_TOPIC_IDS } from '../../../domain/mockData';
import { journalSeedData, MockJournalStore } from '../../../repositories/mockJournalStore';
import { MockQuestionTemplateRepository } from '../mockQuestionTemplateRepository';
import { saveTodayQuestion } from '../todayQuestionCoordinator';

function createStore() {
  return new MockJournalStore(journalSeedData, { user_id: DEMO_USER_ID });
}

describe('today question coordinator', () => {
  it('creates one active daily question through the repository', async () => {
    const repository = new MockQuestionTemplateRepository(createStore());
    const created = await saveTodayQuestion(repository, {
      topicId: MOCK_TOPIC_IDS.relationship,
      questionText: '今日日运如何？',
      frequency: 'daily',
    });
    expect(created).toMatchObject({ question_text: '今日日运如何？', frequency: 'daily' });
  });

  it('preserves saved positions when editing a question', async () => {
    const repository = new MockQuestionTemplateRepository(createStore());
    const existing = await repository.createQuestionTemplate({
      topic_id: MOCK_TOPIC_IDS.relationship,
      question_text: '旧问题',
      frequency: 'daily',
      is_active: true,
      is_pinned: false,
      position_names: ['观察'],
    });
    await saveTodayQuestion(repository, {
      topicId: existing.topic_id,
      questionText: '新问题',
      frequency: 'weekly',
      template: existing,
    });
    expect((await repository.getQuestionTemplate(existing.id))?.positions[0]?.position_name).toBe(
      '观察',
    );
  });

  it('rejects duplicates before writing', async () => {
    const repository = new MockQuestionTemplateRepository(createStore());
    const create = vi.spyOn(repository, 'createQuestionTemplate');
    await expect(
      saveTodayQuestion(repository, {
        topicId: MOCK_TOPIC_IDS.thesis,
        questionText: '今天最值得优先处理的阻碍是什么？',
        frequency: 'daily',
      }),
    ).rejects.toThrow('相同');
    expect(create).not.toHaveBeenCalled();
  });
});
