import { describe, expect, it } from 'vitest';

import { mapDrawSessionCardRow, mapDrawSessionRow } from '../supabaseMappers';

describe('DrawSession Supabase mappers', () => {
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
        overexpressed_probability_when_reversed: 0.5,
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
    expect(session).toMatchObject({ status: 'saved', linkedReadingId: 'reading-1' });
    expect(card).toMatchObject({
      tarotCardId: 0,
      positionSnapshot: 'Reflection',
      orientation: 'upright',
    });
  });
});
