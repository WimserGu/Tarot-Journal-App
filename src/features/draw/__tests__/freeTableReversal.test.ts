import { describe, expect, it } from 'vitest';
import {
  FREE_TABLE_REVERSAL_OPTIONS,
  resolveFreeTableReversal,
  reversalModeForDraw,
} from '../freeTableReversal';
import { DEFAULT_DRAW_CONFIGURATION } from '../drawTypes';

describe('free table reversal selection', () => {
  it('offers disabled, standard, and dual modes', () => {
    expect(FREE_TABLE_REVERSAL_OPTIONS.map((option) => option.value)).toEqual([
      'disabled',
      'standard',
      'dual',
    ]);
  });

  it('uses the selected mode for every draw experience', () => {
    expect(reversalModeForDraw('table', 'dual')).toBe('dual');
    expect(reversalModeForDraw('single', 'disabled')).toBe('disabled');
    expect(reversalModeForDraw('three', 'dual')).toBe('dual');
  });

  it('records no reversal variant in standard mode', () => {
    expect(
      resolveFreeTableReversal({ ...DEFAULT_DRAW_CONFIGURATION, reversalMode: 'standard' }, 0, 0),
    ).toEqual({ orientation: 'reversed', reversalVariant: null });
  });

  it('records left or right in dual mode', () => {
    const configuration = { ...DEFAULT_DRAW_CONFIGURATION, reversalMode: 'dual' as const };

    expect(resolveFreeTableReversal(configuration, 0, 0)).toEqual({
      orientation: 'reversed',
      reversalVariant: 'right',
    });
    expect(resolveFreeTableReversal(configuration, 0, 0.9)).toEqual({
      orientation: 'reversed',
      reversalVariant: 'left',
    });
  });

  it('keeps every card upright when reversals are disabled', () => {
    expect(
      resolveFreeTableReversal({ ...DEFAULT_DRAW_CONFIGURATION, reversalMode: 'disabled' }, 0, 0),
    ).toEqual({ orientation: 'upright', reversalVariant: null });
  });
});
