import { describe, expect, it } from 'vitest';
import { ValidationRepositoryError } from '../repositoryErrors';
import {
  mapQuestionTemplatePositionRow,
  mapQuestionTemplateRow,
  mapQuestionTagRow,
  mapReadingCardRow,
  mapReadingRow,
  mapTopicRow,
} from '../supabaseMappers';

const timestamps = {
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('Supabase mappers', () => {
  it('maps topic and template rows without leaking snake-case display order', () => {
    expect(
      mapTopicRow({
        id: 't',
        user_id: 'u',
        title: 'Topic',
        description: null,
        icon: 'book',
        is_pinned: false,
        archived_at: null,
        ...timestamps,
      }).description,
    ).toBeNull();
    const template = mapQuestionTemplateRow({
      id: 'q',
      user_id: 'u',
      topic_id: 't',
      question_text: 'Why?',
      frequency: 'daily',
      is_active: true,
      is_pinned: false,
      display_order: 2,
      ...timestamps,
    });
    expect(template.displayOrder).toBe(2);
    expect(template).not.toHaveProperty('display_order');
  });
  it('maps a Topic-scoped question tag', () => {
    expect(
      mapQuestionTagRow({
        id: 'tag',
        user_id: 'user',
        topic_id: 'topic',
        name: '对方的想法',
        normalized_name: '对方的想法',
        ...timestamps,
      }),
    ).toMatchObject({ id: 'tag', topic_id: 'topic', name: '对方的想法' });
  });
  it('maps positions, readings and cards with ISO/null/enum validation', () => {
    expect(
      mapQuestionTemplatePositionRow({
        id: 'p',
        user_id: 'u',
        question_template_id: 'q',
        position_order: 1,
        position_name: 'Now',
        ...timestamps,
      }).position_order,
    ).toBe(1);
    expect(
      mapReadingRow({
        id: 'r',
        user_id: 'u',
        topic_id: 't',
        question_template_id: null,
        question_text_snapshot: 'Q',
        reading_at: timestamps.created_at,
        reading_timezone: 'UTC',
        interpretation: null,
        reality_feedback: null,
        status: 'draft',
        is_favorite: false,
        ...timestamps,
      }).question_template_id,
    ).toBeNull();
    expect(
      mapReadingCardRow({
        id: 'c',
        user_id: 'u',
        reading_id: 'r',
        tarot_card_id: null,
        position_order: 1,
        position_name: null,
        orientation: 'reversed',
        interpretation: '保持边界。',
        ...timestamps,
      }),
    ).toMatchObject({ orientation: 'reversed', interpretation: '保持边界。' });
  });
  it('maps unified card-entry fields and defaults legacy rows to manual', () => {
    const base = {
      id: 'c',
      user_id: 'u',
      reading_id: 'r',
      tarot_card_id: 1,
      position_order: 1,
      position_name: null,
      orientation: 'reversed',
      ...timestamps,
    };
    expect(mapReadingCardRow(base)).toMatchObject({
      source: 'manual',
      drawSessionId: null,
      reversalVariant: null,
    });
    expect(
      mapReadingCardRow({
        ...base,
        source: 'drawn',
        draw_session_id: '40000000-0000-4000-8000-000000000001',
        reversal_expression: 'underexpressed',
      }),
    ).toMatchObject({
      source: 'drawn',
      drawSessionId: '40000000-0000-4000-8000-000000000001',
      reversalVariant: 'left',
    });
  });
  it('accepts tarot card id 0 for the Fool and rejects ids outside the 78-card catalog', () => {
    const foolRow = {
      id: 'c',
      user_id: 'u',
      reading_id: 'r',
      tarot_card_id: 0,
      position_order: 1,
      position_name: null,
      orientation: 'upright',
      ...timestamps,
    };

    expect(mapReadingCardRow(foolRow).tarot_card_id).toBe(0);
    expect(() => mapReadingCardRow({ ...foolRow, tarot_card_id: -1 })).toThrow(
      ValidationRepositoryError,
    );
    expect(() => mapReadingCardRow({ ...foolRow, tarot_card_id: 78 })).toThrow(
      ValidationRepositoryError,
    );
  });
  it('rejects illegal card-entry combinations', () => {
    expect(() =>
      mapReadingCardRow({
        id: 'c',
        user_id: 'u',
        reading_id: 'r',
        tarot_card_id: 1,
        position_order: 1,
        position_name: null,
        orientation: 'upright',
        source: 'drawn',
        draw_session_id: null,
        reversal_expression: 'overexpressed',
        ...timestamps,
      }),
    ).toThrow(ValidationRepositoryError);
  });
  it.each([
    [
      'unknown enum',
      () =>
        mapTopicRow({
          id: 't',
          user_id: 'u',
          title: 'T',
          description: null,
          icon: 'bad',
          is_pinned: false,
          archived_at: null,
          ...timestamps,
        }),
    ],
    [
      'bad ISO',
      () =>
        mapReadingRow({
          id: 'r',
          user_id: 'u',
          topic_id: null,
          question_template_id: null,
          question_text_snapshot: null,
          reading_at: 'bad',
          reading_timezone: 'UTC',
          interpretation: null,
          reality_feedback: null,
          status: 'draft',
          is_favorite: false,
          ...timestamps,
        }),
    ],
    [
      'illegal order',
      () =>
        mapQuestionTemplateRow({
          id: 'q',
          user_id: 'u',
          topic_id: 't',
          question_text: 'Q',
          frequency: 'daily',
          is_active: true,
          is_pinned: false,
          display_order: 0,
          ...timestamps,
        }),
    ],
  ])('rejects %s', (_label, action) => expect(action).toThrow(ValidationRepositoryError));
});
