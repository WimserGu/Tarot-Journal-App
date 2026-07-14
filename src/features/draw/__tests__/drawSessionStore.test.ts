import { afterEach, describe, expect, it } from 'vitest';

import {
  createDrawSession,
  drawSessionCardsToForm,
  getActiveDrawSession,
  linkActiveDrawSession,
  setActiveDrawSession,
} from '../drawSessionStore';
import { DEFAULT_DRAW_CONFIGURATION, type DrawResult, type DrawSession } from '../drawTypes';

const cards = [
  {
    id: 'drawn-1' as const,
    tarotCardId: 0,
    positionIndex: 0,
    spreadPositionId: 'single-card.reflection',
    orientation: 'reversed' as const,
    reversalExpression: 'underexpressed' as const,
    source: 'drawn' as const,
  },
];

const result: DrawResult = {
  cards,
  configuration: DEFAULT_DRAW_CONFIGURATION,
  createdAt: '2026-07-13T10:00:00.000Z',
};

afterEach(() => setActiveDrawSession(null));

describe('temporary DrawSession coordination', () => {
  it('creates a serializable session and preserves drawn provenance', () => {
    const session = createDrawSession(result);
    expect(session.createdAt).toBe('2026-07-13T10:00:00.000Z');
    expect(session.cards[0]).toMatchObject({ source: 'drawn', drawSessionId: session.id });
    expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('maps the session into the existing Reading form card model', () => {
    const session = createDrawSession(result);
    expect(drawSessionCardsToForm(session)[0]).toMatchObject({
      tarot_card_id: 0,
      orientation: 'reversed',
      reversalExpression: 'underexpressed',
      source: 'drawn',
      drawSessionId: session.id,
    });
  });
  it('removes free-table position ids when mapping to a Reading without a spread', () => {
    const baseSession = createDrawSession(result);
    const freeTableSession = {
      ...baseSession,
      spreadId: null,
      configuration: {
        ...DEFAULT_DRAW_CONFIGURATION,
        spreadId: 'free-table',
        spreadPositionIds: ['free-table.1'],
      },
      cards: [
        {
          ...baseSession.cards[0]!,
          spreadPositionId: 'free-table.1',
          positionSnapshot: 'Card 1',
        },
      ],
    } satisfies DrawSession;

    expect(drawSessionCardsToForm(freeTableSession)[0]).toMatchObject({
      position_name: 'Card 1',
      spreadPositionId: null,
      source: 'drawn',
      drawSessionId: freeTableSession.cards[0]!.drawSessionId,
    });
  });
  it('links the in-memory session after Reading save', () => {
    const session = createDrawSession(result);
    setActiveDrawSession(session);
    linkActiveDrawSession('reading-1');
    expect(getActiveDrawSession(session.id)?.linkedReadingId).toBe('reading-1');
  });
  it('discards an unsaved session without persistence', () => {
    const session = createDrawSession(result);
    setActiveDrawSession(session);
    setActiveDrawSession(null);
    expect(getActiveDrawSession()).toBeNull();
  });
});
