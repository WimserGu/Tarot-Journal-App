import { describe, expect, it } from 'vitest';

import { filterAndSortDrawSessions, linkedReadingIsMissing } from '../drawSessionPresentation';
import type { DrawSession } from '../drawTypes';

const session = (id: string, createdAt: string, status: DrawSession['status']): DrawSession => ({
  id,
  userId: 'user-1',
  createdAt,
  updatedAt: createdAt,
  spreadId: 'single-card',
  configuration: {
    cardCount: 1,
    spreadId: 'single-card',
    spreadPositionIds: ['single-card.reflection'],
    reversalMode: 'standard',
    reversedProbability: 0.5,
    rightProbabilityWhenReversed: 0.5,
  },
  status,
  linkedReadingId: status === 'saved' ? 'reading-1' : null,
  cards: [],
});

describe('DrawSession presentation', () => {
  it('filters draft and saved history, then sorts deterministically', () => {
    const sessions = [
      session('older', '2026-07-01T00:00:00.000Z', 'saved'),
      session('newer', '2026-07-02T00:00:00.000Z', 'draft'),
    ];
    expect(filterAndSortDrawSessions(sessions, 'all', 'newest').map((item) => item.id)).toEqual([
      'newer',
      'older',
    ]);
    expect(filterAndSortDrawSessions(sessions, 'saved', 'oldest').map((item) => item.id)).toEqual([
      'older',
    ]);
  });

  it('identifies a deleted linked Reading while keeping the DrawSession available', () => {
    expect(linkedReadingIsMissing(session('saved', '2026-07-01T00:00:00.000Z', 'saved'), [])).toBe(
      true,
    );
  });
});
