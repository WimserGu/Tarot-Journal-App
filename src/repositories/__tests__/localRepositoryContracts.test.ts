import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_USER_ID, MOCK_QUESTION_IDS, MOCK_TOPIC_IDS } from '../../domain/mockData';
import { MockQuestionTemplateRepository } from '../../features/questions/mockQuestionTemplateRepository';
import { MockReadingRepository } from '../../features/readings/mockReadingRepository';
import { MockTopicRepository } from '../../features/topics/mockTopicRepository';
import { journalSeedData, MockJournalStore } from '../mockJournalStore';

describe('shared local repository contracts', () => {
  let store: MockJournalStore;
  let topics: MockTopicRepository;
  let questions: MockQuestionTemplateRepository;
  let readings: MockReadingRepository;
  beforeEach(() => {
    store = new MockJournalStore(journalSeedData, {
      user_id: DEMO_USER_ID,
      now: () => '2026-07-12T00:00:00.000Z',
      create_id: (kind) => `new-${kind}`,
    });
    topics = new MockTopicRepository(store);
    questions = new MockQuestionTemplateRepository(store);
    readings = new MockReadingRepository(store);
  });

  it('keeps Topic pinned/activity ordering and null get semantics', async () => {
    const list = await topics.listTopics();
    expect(list[0]?.topic.is_pinned).toBe(true);
    expect(await topics.getTopicDetail('missing')).toBeNull();
  });
  it('allocates, reorders, toggles and compacts independent template display order', async () => {
    const created = await questions.createQuestionTemplate({
      topic_id: MOCK_TOPIC_IDS.thesis,
      question_text: '  New question  ',
      frequency: 'daily',
      is_active: true,
      is_pinned: false,
      position_names: ['Past', 'Future'],
    });
    expect(created.displayOrder).toBe(3);
    expect(
      (
        await questions.findDuplicateQuestionTemplate({
          topic_id: MOCK_TOPIC_IDS.thesis,
          question_text: 'new   QUESTION',
        })
      )?.id,
    ).toBe(created.id);
    expect((await questions.setQuestionTemplateActive(created.id, false)).is_active).toBe(false);
    const ids = (await questions.listQuestionTemplates(MOCK_TOPIC_IDS.thesis))
      .map((q) => q.id)
      .reverse();
    expect(
      (await questions.reorderQuestionTemplates(MOCK_TOPIC_IDS.thesis, ids)).map(
        (q) => q.displayOrder,
      ),
    ).toEqual([1, 2, 3]);
    await questions.deleteQuestionTemplate(created.id);
    expect(
      (await questions.listQuestionTemplates(MOCK_TOPIC_IDS.thesis)).map((q) => q.displayOrder),
    ).toEqual([1, 2]);
  });
  it('filters readings by date/basic fields and keeps card order continuous', async () => {
    const all = await readings.listReadings({ topic_id: MOCK_TOPIC_IDS.thesis });
    expect(all.length).toBeGreaterThan(0);
    const favorite = await readings.listReadings({
      topic_id: MOCK_TOPIC_IDS.thesis,
      is_favorite: true,
    });
    expect(favorite.every((x) => x.reading.is_favorite)).toBe(true);
    const ranged = await readings.listReadings({
      date_from: '2026-07-01T00:00:00.000Z',
      date_to: '2026-07-31T23:59:59.999Z',
    });
    expect(ranged.every((x) => x.reading.reading_at.startsWith('2026-07'))).toBe(true);
    expect(
      all
        .flatMap((x) => x.cards)
        .every(
          (card, index, array) =>
            card.position_order >= 1 && array.filter((c) => c === card).length === 1,
        ),
    ).toBe(true);
  });
  it('deleting a template preserves historical Reading snapshot', async () => {
    const before = store
      .snapshot()
      .readings.filter((r) => r.question_template_id === MOCK_QUESTION_IDS.thesisProgress)
      .map((r) => r.question_text_snapshot);
    await questions.deleteQuestionTemplate(MOCK_QUESTION_IDS.thesisProgress);
    const after = store
      .snapshot()
      .readings.filter((r) => r.question_template_id === MOCK_QUESTION_IDS.thesisProgress)
      .map((r) => r.question_text_snapshot);
    expect(after).toEqual(before);
  });
});
