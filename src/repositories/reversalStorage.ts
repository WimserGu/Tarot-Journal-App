import type { ReversalVariant } from '../domain/types';

export type LegacyStoredReversalVariant = 'underexpressed' | 'overexpressed';

export function decodeStoredReversalVariant(value: unknown): ReversalVariant | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value === 'left' || value === 'underexpressed') return 'left';
  if (value === 'right' || value === 'overexpressed') return 'right';
  return undefined;
}

export function encodeStoredReversalVariant(
  value: ReversalVariant,
): LegacyStoredReversalVariant | null {
  if (value === 'left') return 'underexpressed';
  if (value === 'right') return 'overexpressed';
  return null;
}
