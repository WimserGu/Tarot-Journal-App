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
import { buildReadingShareText, deleteReadingAfterConfirmation } from '../readingDetailActions';
import { MockReadingRepository } from '../mockReadingRepository';
import { ReadingNotFoundError } from '../readingRepository';

const existingReadingId = mockReadings[0]!.id;

function createStore() {
  let id = 0;

  return new MockJournalStore(
    {
      topics: mockTopics,
      question_templates: mockQuestionTemplates,
      question_template_positions: mockQuestionTemplatePositions,
      readings: mockReadings,
      reading_cards: mockReadingCards,
      tarot_cards: tarotCards,
    },
    {
      user_id: DEMO_USER_ID,
      now: () => '2026-07-12T09:00:00.000Z',
      create_id: (entity) => `${entity}-${++id}`,
    },
  );
}

function completedInput() {
  return {
    topic_id: MOCK_TOPIC_IDS.thesis,
    question_template_id: null,
    temporary_question: '更新后的问题是什么？',
    reading_at: '2026-07-12T08:30:00.000Z',
    reading_timezone: 'Africa/Nairobi',
    interpretation: '更新后的个人解读。',
    status: 'completed' as const,
    cards: [
      {
        tarot_card_id: 57,
        position_name: '阻碍',
        orientation: 'reversed' as const,
        position_order: 1,
      },
      {
        tarot_card_id: 71,
        position_name: '建议',
        orientation: 'upright' as const,
        position_order: 2,
      },
    ],
  };
}

describe('reading detail actions', () => {
  it('loads a complete detail view with topic, template source, cards, and metadata', async () => {
    const repository = new MockReadingRepository(createStore());
    const detail = await repository.getReadingDetail(existingReadingId);

    expect(detail?.topic.id).toBe(MOCK_TOPIC_IDS.thesis);
    expect(detail?.question_template?.id).toBe(MOCK_QUESTION_IDS.thesisObstacle);
    expect(detail?.cards.map((card) => card.reading_card.position_order)).toEqual([1, 2]);
    expect(detail?.reading.created_at).toBeTruthy();
    expect(detail?.reading.updated_at).toBeTruthy();
  });

  it('updates the question, card orientations, and continuous card order', async () => {
    const repository = new MockReadingRepository(createStore());
    await repository.updateReading(existingReadingId, completedInput());
    const detail = await repository.getReadingDetail(existingReadingId);

    expect(detail?.question_text).toBe('更新后的问题是什么？');
    expect(detail?.cards.map((card) => card.reading_card.orientation)).toEqual([
      'reversed',
      'upright',
    ]);
    expect(detail?.cards.map((card) => card.reading_card.position_order)).toEqual([1, 2]);
  });

  it('keeps the historical question snapshot when retaining the same template', async () => {
    const repository = new MockReadingRepository(createStore());
    const original = await repository.getReadingDetail(existingReadingId);

    await repository.updateReading(existingReadingId, {
      ...completedInput(),
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
      temporary_question: null,
    });

    expect((await repository.getReadingDetail(existingReadingId))?.question_text).toBe(
      original?.question_text,
    );
  });

  it('promotes a draft to a completed reading', async () => {
    const repository = new MockReadingRepository(createStore());
    const draft = await repository.createReading({
      ...completedInput(),
      status: 'draft',
      cards: [],
    });

    const updated = await repository.updateReading(draft.id, completedInput());

    expect(updated.status).toBe('completed');
    expect((await repository.getReadingDetail(draft.id))?.cards).toHaveLength(2);
  });

  it('does not delete on cancellation and deletes after confirmation', async () => {
    const repository = new MockReadingRepository(createStore());

    await expect(
      deleteReadingAfterConfirmation(repository, existingReadingId, false),
    ).resolves.toBe(false);
    expect(await repository.getReadingDetail(existingReadingId)).not.toBeNull();
    await expect(deleteReadingAfterConfirmation(repository, existingReadingId, true)).resolves.toBe(
      true,
    );
    expect(await repository.getReadingDetail(existingReadingId)).toBeNull();
  });

  it('toggles the favorite state', async () => {
    const repository = new MockReadingRepository(createStore());
    const initial = await repository.getReadingDetail(existingReadingId);
    const updated = await repository.toggleFavorite(existingReadingId);

    expect(updated.is_favorite).toBe(!initial?.reading.is_favorite);
  });

  it('creates a private-ID-free text share summary', async () => {
    const store = createStore();
    const repository = new MockReadingRepository(store);
    const detail = await repository.getReadingDetail(existingReadingId);

    expect(detail).not.toBeNull();

    const summary = buildReadingShareText(detail!);

    expect(summary).toContain(detail!.question_text);
    expect(summary).not.toContain(detail!.reading.id);
    expect(summary).not.toContain(detail!.reading.user_id);
    expect(summary).not.toContain('repository');
  });

  it('returns a friendly missing result and rejects an unavailable update', async () => {
    const repository = new MockReadingRepository(createStore());

    await expect(repository.getReadingDetail('missing-reading')).resolves.toBeNull();
    await expect(
      repository.updateReading('missing-reading', completedInput()),
    ).rejects.toBeInstanceOf(ReadingNotFoundError);
  });
});
