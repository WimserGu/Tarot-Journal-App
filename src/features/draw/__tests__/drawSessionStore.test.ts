import { afterEach, describe, expect, it } from 'vitest';

import {
  createDrawSession,
  drawSessionCardsToForm,
  getActiveDrawSession,
  linkActiveDrawSession,
  setActiveDrawSession,
} from '../drawSessionStore';
import { DEFAULT_DRAW_CONFIGURATION } from '../drawTypes';

const cards = [
  {
    id: 'drawn-1' as const,
    tarotCardId: 0,
    positionIndex: 0,
    orientation: 'reversed' as const,
    reversalExpression: 'underexpressed' as const,
    source: 'drawn' as const,
  },
];

afterEach(() => setActiveDrawSession(null));

describe('temporary DrawSession coordination', () => {
  it('creates a serializable session and preserves drawn provenance', () => {
    const session = createDrawSession(
      DEFAULT_DRAW_CONFIGURATION,
      cards,
      new Date('2026-07-13T10:00:00.000Z'),
    );
    expect(session.createdAt).toBe('2026-07-13T10:00:00.000Z');
    expect(session.cards[0]).toMatchObject({ source: 'drawn', drawSessionId: session.id });
    expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('maps the session into the existing Reading form card model', () => {
    const session = createDrawSession(DEFAULT_DRAW_CONFIGURATION, cards);
    expect(drawSessionCardsToForm(session)[0]).toMatchObject({
      tarot_card_id: 0,
      orientation: 'reversed',
      reversalExpression: 'underexpressed',
      source: 'drawn',
      drawSessionId: session.id,
    });
  });
  it('links the in-memory session after Reading save', () => {
    const session = createDrawSession(DEFAULT_DRAW_CONFIGURATION, cards);
    setActiveDrawSession(session);
    linkActiveDrawSession('reading-1');
    expect(getActiveDrawSession(session.id)?.linkedReadingId).toBe('reading-1');
  });
  it('discards an unsaved session without persistence', () => {
    const session = createDrawSession(DEFAULT_DRAW_CONFIGURATION, cards);
    setActiveDrawSession(session);
    setActiveDrawSession(null);
    expect(getActiveDrawSession()).toBeNull();
  });
});
