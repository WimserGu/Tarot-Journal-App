import { describe, expect, it } from 'vitest';

import { mapDrawSessionCardRow, mapDrawSessionRow } from '../supabaseMappers';
import { drawConfigurationRow } from '../supabaseDrawSessionRepository';
import { DEFAULT_DRAW_CONFIGURATION } from '../../features/draw/drawTypes';

describe('DrawSession Supabase mappers', () => {
  it('serializes table placement without dropping other configuration state', () => {
    expect(
      drawConfigurationRow({
        configuration: {
          ...DEFAULT_DRAW_CONFIGURATION,
          sourceTopicId: 'topic-1',
          sourceQuestionTemplateId: 'question-1',
          hiddenDeckCardIds: [3, 1, 2],
          ritual: {
            stage: 'reveal',
            drawnCount: 1,
            revealedPositionIndexes: [0],
            isObserving: true,
            cardNotes: { card: 'note' },
          },
          table: {
            placementsByCardId: {
              'position:0': { x: 0.25, y: 0.75, zIndex: 4 },
            },
          },
        },
      }),
    ).toMatchObject({
      source_topic_id: 'topic-1',
      source_question_template_id: 'question-1',
      hidden_deck_card_ids: [3, 1, 2],
      ritual: {
        revealed_position_indexes: [0],
        is_observing: true,
        card_notes: { card: 'note' },
      },
      table: {
        placements_by_card_id: {
          'position:0': { x: 0.25, y: 0.75, z_index: 4 },
        },
      },
    });
  });
  it('maps a saved session and its immutable card snapshot', () => {
    const session = mapDrawSessionRow({
      id: 'session-1',
      user_id: 'user-1',
      created_at: '2026-07-13T12:00:00.000Z',
      updated_at: '2026-07-13T12:01:00.000Z',
      spread_id: 'single-card',
      status: 'saved',
      linked_reading_id: 'reading-1',
      configuration: {
        card_count: 1,
        spread_id: 'single-card',
        spread_position_ids: ['single-card.reflection'],
        reversal_mode: 'standard',
        reversed_probability: 0.5,
        right_probability_when_reversed: 0.5,
        question_text: 'What should I notice?',
        source_topic_id: 'topic-1',
        source_question_template_id: 'question-1',
        ritual: { stage: 'reveal', drawn_count: 1, revealed_position_indexes: [0] },
        table: {
          placements_by_card_id: {
            'position:0': { x: 0.4, y: 0.6, z_index: 2 },
          },
        },
      },
    });
    const card = mapDrawSessionCardRow({
      id: 'card-1',
      draw_session_id: 'session-1',
      tarot_card_id: 0,
      position_index: 0,
      spread_position_id: 'single-card.reflection',
      position_snapshot: 'Reflection',
      orientation: 'upright',
      reversal_expression: null,
      source: 'drawn',
    });
    expect(session).toMatchObject({
      status: 'saved',
      linkedReadingId: 'reading-1',
      configuration: {
        questionText: 'What should I notice?',
        sourceTopicId: 'topic-1',
        sourceQuestionTemplateId: 'question-1',
        ritual: { stage: 'reveal', drawnCount: 1, revealedPositionIndexes: [0] },
        table: {
          placementsByCardId: {
            'position:0': { x: 0.4, y: 0.6, zIndex: 2 },
          },
        },
      },
    });
    expect(card).toMatchObject({
      tarotCardId: 0,
      positionSnapshot: 'Reflection',
      orientation: 'upright',
    });
  });
  it('maps legacy dual-mode configuration and card storage values', () => {
    const session = mapDrawSessionRow({
      id: 'legacy-session',
      user_id: 'user-1',
      created_at: '2026-07-13T12:00:00.000Z',
      updated_at: '2026-07-13T12:01:00.000Z',
      spread_id: null,
      status: 'draft',
      linked_reading_id: null,
      configuration: {
        card_count: 1,
        spread_id: 'free-table',
        spread_position_ids: ['free-table.1'],
        reversal_mode: 'expression',
        reversed_probability: 0.5,
        overexpressed_probability_when_reversed: 0.5,
      },
    });
    const left = mapDrawSessionCardRow({
      id: 'legacy-card',
      draw_session_id: 'legacy-session',
      tarot_card_id: 1,
      position_index: 0,
      spread_position_id: 'free-table.1',
      position_snapshot: 'Card 1',
      orientation: 'reversed',
      reversal_expression: 'underexpressed',
      source: 'drawn',
    });
    expect(session.configuration).toMatchObject({
      reversalMode: 'dual',
      rightProbabilityWhenReversed: 0.5,
    });
    expect(left.reversalVariant).toBe('left');
  });
});
