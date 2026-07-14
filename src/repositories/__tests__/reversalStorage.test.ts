import { describe, expect, it } from 'vitest';

import { decodeStoredReversalVariant, encodeStoredReversalVariant } from '../reversalStorage';

describe('legacy reversal storage compatibility', () => {
  it('decodes legacy storage values into the new domain variants', () => {
    expect(decodeStoredReversalVariant('underexpressed')).toBe('left');
    expect(decodeStoredReversalVariant('overexpressed')).toBe('right');
  });

  it('encodes domain variants for the existing constrained columns', () => {
    expect(encodeStoredReversalVariant('left')).toBe('underexpressed');
    expect(encodeStoredReversalVariant('right')).toBe('overexpressed');
    expect(encodeStoredReversalVariant(null)).toBeNull();
  });
});
