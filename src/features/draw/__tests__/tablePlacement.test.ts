import { describe, expect, it } from 'vitest';
import {
  defaultTablePlacement,
  nextTableZIndex,
  normalizeTablePlacement,
  pixelPlacement,
  placementFromWindowDrop,
  placementFromPixels,
  tablePlacementKey,
  tableStateForSession,
  updateTablePlacement,
  withInitialTablePlacement,
} from '../tablePlacement';
import { DEFAULT_DRAW_CONFIGURATION, type DrawSession } from '../drawTypes';

function sessionWithCards(): DrawSession {
  return {
    id: 'session',
    userId: 'user',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    spreadId: null,
    status: 'draft',
    linkedReadingId: null,
    configuration: {
      ...DEFAULT_DRAW_CONFIGURATION,
      spreadId: 'free-table',
      spreadPositionIds: ['free-table.1', 'free-table.2'],
    },
    cards: [0, 1].map((positionIndex) => ({
      id: `database-id-${positionIndex}`,
      tarotCardId: positionIndex,
      positionIndex,
      spreadPositionId: `free-table.${positionIndex + 1}`,
      positionSnapshot: `Card ${positionIndex + 1}`,
      orientation: 'upright' as const,
      reversalVariant: null,
      source: 'drawn' as const,
      drawSessionId: 'session',
    })),
  };
}

describe('normalized tarot table placement', () => {
  it('gives new and old cards deterministic safe placements', () => {
    expect(defaultTablePlacement(0)).toEqual(defaultTablePlacement(0));
    expect(tableStateForSession(sessionWithCards()).placementsByCardId).toMatchObject({
      'position:0': defaultTablePlacement(0),
      'position:1': defaultTablePlacement(1),
    });
  });

  it('adds an initial placement without replacing existing configuration', () => {
    const next = withInitialTablePlacement(DEFAULT_DRAW_CONFIGURATION, 'position:0', 0);
    expect(next.table?.placementsByCardId['position:0']).toEqual(defaultTablePlacement(0));
    expect(next.reversalMode).toBe(DEFAULT_DRAW_CONFIGURATION.reversalMode);
  });

  it('clamps invalid normalized coordinates and z-index', () => {
    expect(normalizeTablePlacement({ x: -2, y: 3, zIndex: 5000 }, 0)).toEqual({
      x: 0,
      y: 1,
      zIndex: 1000,
    });
  });

  it('keeps the whole card inside the table after dragging', () => {
    const table = { width: 500, height: 300 };
    const card = { width: 82, height: 124 };
    const placement = placementFromPixels(900, -40, table, card, 4);
    expect(placement).toMatchObject({ x: 1, y: 0, zIndex: 4 });
    expect(pixelPlacement(placement, table, card)).toEqual({ left: 418, top: 0 });
  });

  it('places a deck card at its drop point inside the table', () => {
    expect(
      placementFromWindowDrop(
        { x: 300, y: 250 },
        { x: 100, y: 100, width: 400, height: 300 },
        { width: 80, height: 120 },
        4,
      ),
    ).toEqual({ x: 0.5, y: 0.5, zIndex: 4 });
  });

  it('cancels a deck-card drop outside the table', () => {
    expect(
      placementFromWindowDrop(
        { x: 99, y: 250 },
        { x: 100, y: 100, width: 400, height: 300 },
        { width: 80, height: 120 },
        4,
      ),
    ).toBeNull();
  });

  it('keeps a card fully visible when dropped at a table edge', () => {
    expect(
      placementFromWindowDrop(
        { x: 100, y: 100 },
        { x: 100, y: 100, width: 400, height: 300 },
        { width: 80, height: 120 },
        5,
      ),
    ).toEqual({ x: 0, y: 0, zIndex: 5 });
  });

  it('restores equivalent normalized placement at another table size', () => {
    const placement = { x: 0.5, y: 0.25, zIndex: 2 };
    expect(
      pixelPlacement(placement, { width: 500, height: 400 }, { width: 100, height: 100 }),
    ).toEqual({ left: 200, top: 75 });
    expect(
      pixelPlacement(placement, { width: 300, height: 200 }, { width: 100, height: 100 }),
    ).toEqual({ left: 100, top: 25 });
  });

  it('moves one card to the front without changing another placement', () => {
    const session = sessionWithCards();
    const state = tableStateForSession(session);
    const firstKey = tablePlacementKey(session.cards[0]!);
    const secondKey = tablePlacementKey(session.cards[1]!);
    const updated = updateTablePlacement(session, session.cards[0]!.id, {
      x: 0.8,
      y: 0.7,
      zIndex: nextTableZIndex(state),
    });
    const nextState = tableStateForSession(updated);
    expect(nextState.placementsByCardId[firstKey]).toMatchObject({ x: 0.8, y: 0.7, zIndex: 3 });
    expect(nextState.placementsByCardId[secondKey]).toEqual(state.placementsByCardId[secondKey]);
  });

  it('uses draw order as a stable key when repository row ids change', () => {
    const session = sessionWithCards();
    const updated = updateTablePlacement(session, session.cards[0]!.id, {
      x: 0.6,
      y: 0.4,
      zIndex: 3,
    });
    updated.cards[0] = { ...updated.cards[0]!, id: 'new-database-id' };
    expect(tableStateForSession(updated).placementsByCardId['position:0']).toMatchObject({
      x: 0.6,
      y: 0.4,
    });
  });
});
