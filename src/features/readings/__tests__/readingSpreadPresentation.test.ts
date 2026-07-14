import { describe, expect, it } from 'vitest';
import {
  FREE_TABLE_SPREAD_LABEL,
  LEGACY_UNSPECIFIED_SPREAD_LABEL,
  readingSpreadLabel,
} from '../readingSpreadPresentation';

describe('Reading spread presentation', () => {
  it('labels a free-table Reading without changing its null spread value', () => {
    expect(readingSpreadLabel(undefined, FREE_TABLE_SPREAD_LABEL)).toBe('自由牌桌（无固定牌阵）');
  });

  it('keeps the legacy label when no custom presentation is provided', () => {
    expect(readingSpreadLabel(undefined)).toBe(LEGACY_UNSPECIFIED_SPREAD_LABEL);
  });
});
