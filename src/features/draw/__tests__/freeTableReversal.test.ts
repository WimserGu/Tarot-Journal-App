import { describe, expect, it } from 'vitest';
import {
  FREE_TABLE_REVERSAL_OPTIONS,
  resolveFreeTableReversal,
  reversalModeForDraw,
} from '../freeTableReversal';
import { DEFAULT_DRAW_CONFIGURATION } from '../drawTypes';

describe('free table reversal selection', () => {
  it('offers disabled, standard, and expression modes', () => {
    expect(FREE_TABLE_REVERSAL_OPTIONS.map((option) => option.value)).toEqual([
      'disabled',
      'standard',
      'expression',
    ]);
  });

  it('uses the selected mode only for the free table', () => {
    expect(reversalModeForDraw('table', 'expression')).toBe('expression');
    expect(reversalModeForDraw('single', 'disabled')).toBe('standard');
    expect(reversalModeForDraw('three', 'expression')).toBe('standard');
  });

  it('records no reversal expression in standard mode', () => {
    expect(
      resolveFreeTableReversal({ ...DEFAULT_DRAW_CONFIGURATION, reversalMode: 'standard' }, 0, 0),
    ).toEqual({ orientation: 'reversed', reversalExpression: null });
  });

  it('records underexpressed or overexpressed in expression mode', () => {
    const configuration = { ...DEFAULT_DRAW_CONFIGURATION, reversalMode: 'expression' as const };

    expect(resolveFreeTableReversal(configuration, 0, 0)).toEqual({
      orientation: 'reversed',
      reversalExpression: 'overexpressed',
    });
    expect(resolveFreeTableReversal(configuration, 0, 0.9)).toEqual({
      orientation: 'reversed',
      reversalExpression: 'underexpressed',
    });
  });

  it('keeps every card upright when reversals are disabled', () => {
    expect(
      resolveFreeTableReversal({ ...DEFAULT_DRAW_CONFIGURATION, reversalMode: 'disabled' }, 0, 0),
    ).toEqual({ orientation: 'upright', reversalExpression: null });
  });
});
