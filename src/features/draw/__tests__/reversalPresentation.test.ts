import { describe, expect, it } from 'vitest';

import {
  isReversalStateValidForMode,
  reversalAccessibilityLabel,
  reversalModeLabel,
  reversalStateLabel,
  reversalStatesForMode,
  reversalVariantForArtworkInspection,
} from '../reversalPresentation';

describe('dual reversal presentation', () => {
  it('uses the final product names and accessible labels', () => {
    expect(reversalModeLabel('dual')).toBe('双逆位模式');
    expect(reversalStateLabel('reversed', 'left')).toBe('逆位・左旋');
    expect(reversalStateLabel('reversed', 'right')).toBe('逆位・右旋');
    expect(reversalAccessibilityLabel('reversed', 'left')).toBe('逆位，左旋三十度');
    expect(reversalAccessibilityLabel('reversed', 'right')).toBe('逆位，右旋三十度');
  });

  it('offers only states that are valid for each mode', () => {
    expect(reversalStatesForMode('disabled')).toEqual([
      { orientation: 'upright', reversalVariant: null, label: '正位' },
    ]);
    expect(reversalStatesForMode('standard').map((state) => state.reversalVariant)).toEqual([
      null,
      null,
    ]);
    expect(reversalStatesForMode('dual').map((state) => state.reversalVariant)).toEqual([
      null,
      'left',
      'right',
    ]);
    expect(isReversalStateValidForMode('dual', 'reversed', null)).toBe(false);
    expect(isReversalStateValidForMode('standard', 'reversed', 'left')).toBe(false);
  });

  it('temporarily shows a dual reversal as traditional without changing its original variant', () => {
    expect(reversalVariantForArtworkInspection('left', true)).toBeNull();
    expect(reversalVariantForArtworkInspection('right', true)).toBeNull();
    expect(reversalVariantForArtworkInspection('left', false)).toBe('left');
    expect(reversalVariantForArtworkInspection('right', false)).toBe('right');
  });
});
