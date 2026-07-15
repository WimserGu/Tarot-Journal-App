import { describe, expect, it } from 'vitest';

import { DEMO_USER_ID, MOCK_TOPIC_IDS } from '../../../domain/mockData';
import { tarotCards } from '../../../domain/tarotCards';
import { journalSeedData, MockJournalStore } from '../../../repositories/mockJournalStore';
import { MockQuestionTagRepository } from '../mockQuestionTagRepository';
import { addRelationshipQuestionTagPresets } from '../questionTagPresets';

function createRepository() {
  let id = 0;
  const store = new MockJournalStore(
    { ...journalSeedData, question_tags: [], tarot_cards: tarotCards },
    {
      user_id: DEMO_USER_ID,
      now: () => '2026-07-14T18:00:00.000Z',
      create_id: (entity) => `${entity}-${++id}`,
    },
  );
  return new MockQuestionTagRepository(store);
}

describe('QuestionTagRepository', () => {
  it('creates tags inside one Topic and reuses an exact normalized name', async () => {
    const repository = createRepository();
    const first = await repository.createOrReuseQuestionTag({
      topic_id: MOCK_TOPIC_IDS.relationship,
      name: '对方的想法',
    });
    const reused = await repository.createOrReuseQuestionTag({
      topic_id: MOCK_TOPIC_IDS.relationship,
      name: '  对方的想法  ',
    });

    expect(reused.id).toBe(first.id);
    expect(await repository.listQuestionTags(MOCK_TOPIC_IDS.relationship)).toHaveLength(1);
    expect(await repository.listQuestionTags(MOCK_TOPIC_IDS.thesis)).toHaveLength(0);
  });

  it('adds the five relationship presets idempotently', async () => {
    const repository = createRepository();
    await addRelationshipQuestionTagPresets(repository, MOCK_TOPIC_IDS.relationship);
    await addRelationshipQuestionTagPresets(repository, MOCK_TOPIC_IDS.relationship);

    expect(
      (await repository.listQuestionTags(MOCK_TOPIC_IDS.relationship)).map((tag) => tag.name),
    ).toEqual(expect.arrayContaining(['对方的想法', '我的状态', '关系走向', '沟通', '行动建议']));
    expect(await repository.listQuestionTags(MOCK_TOPIC_IDS.relationship)).toHaveLength(5);
  });

  it('adds only the selected recommendation tabs', async () => {
    const repository = createRepository();

    await addRelationshipQuestionTagPresets(repository, MOCK_TOPIC_IDS.relationship, [
      '对方的想法',
      '沟通',
    ]);

    const tags = await repository.listQuestionTags(MOCK_TOPIC_IDS.relationship);
    expect(tags.map((tag) => tag.name)).toEqual(expect.arrayContaining(['对方的想法', '沟通']));
    expect(tags).toHaveLength(2);
  });

  it('deletes a tag without affecting other tags in the Topic', async () => {
    const repository = createRepository();
    const deleted = await repository.createOrReuseQuestionTag({
      topic_id: MOCK_TOPIC_IDS.relationship,
      name: '对方的想法',
    });
    const retained = await repository.createOrReuseQuestionTag({
      topic_id: MOCK_TOPIC_IDS.relationship,
      name: '沟通',
    });

    await repository.deleteQuestionTag(deleted.id);

    expect(await repository.listQuestionTags(MOCK_TOPIC_IDS.relationship)).toEqual([retained]);
  });
});
