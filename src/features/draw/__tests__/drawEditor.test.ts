import { describe, expect, it } from 'vitest';

import { tarotCards } from '../../../domain/tarotCards';
import {
  appendManualDrawCard,
  removeDrawnCard,
  replaceDrawnCard,
  setDrawnCardExpression,
  setDrawnCardOrientation,
} from '../drawEditor';
import type { DrawnCard } from '../drawTypes';

const drawn: DrawnCard = {
  id: 'card-1',
  tarotCardId: 0,
  positionIndex: 0,
  orientation: 'reversed',
  reversalExpression: 'overexpressed',
  source: 'drawn',
  drawSessionId: 'session-1',
};

describe('draw result editing', () => {
  it('keeps drawn source when changing the selected card', () => {
    expect(replaceDrawnCard(drawn, tarotCards[1]!).source).toBe('drawn');
  });
  it('clears expression when changed to upright', () => {
    expect(setDrawnCardOrientation(drawn, 'upright')).toMatchObject({
      orientation: 'upright',
      reversalExpression: null,
    });
  });
  it('sets both reversal expression variants', () => {
    expect(setDrawnCardExpression(drawn, 'underexpressed').reversalExpression).toBe(
      'underexpressed',
    );
    expect(setDrawnCardExpression(drawn, 'overexpressed').reversalExpression).toBe('overexpressed');
  });
  it('rejects an expression on an upright card', () => {
    expect(() =>
      setDrawnCardExpression(setDrawnCardOrientation(drawn, 'upright'), 'overexpressed'),
    ).toThrow();
  });
  it('reindexes remaining cards after deletion', () => {
    const cards = [
      drawn,
      { ...drawn, id: 'card-2', positionIndex: 1 },
      { ...drawn, id: 'card-3', positionIndex: 2 },
    ];
    expect(removeDrawnCard(cards, 1).map((card) => card.positionIndex)).toEqual([0, 1]);
  });
  it('marks cards added on the result screen as manual', () => {
    expect(appendManualDrawCard([drawn], tarotCards[2]!, 'manual-1')[1]).toMatchObject({
      source: 'manual',
      drawSessionId: null,
      positionIndex: 1,
    });
  });
});
