import { describe, expect, it } from 'vitest';

import { shouldScrollAfterImportPaste } from '../importScrollBehavior';

describe('Import Assistant paste scrolling', () => {
  it('recognizes a long Reading paste', () => {
    const pasted = `[Reading]
Date: 2026-07-11
Topic:
Question: 她想坦白的是什么
Cards:
- 愚人 | upright`;

    expect(shouldScrollAfterImportPaste('', pasted)).toBe(true);
  });

  it('does not move the page for ordinary typing, deletion, or unrelated prose', () => {
    expect(shouldScrollAfterImportPaste('', '[Re')).toBe(false);
    expect(shouldScrollAfterImportPaste('[Reading]\nDate:', '[Reading]\nDate: 2026')).toBe(false);
    expect(shouldScrollAfterImportPaste('[Reading]\nDate: 2026', '')).toBe(false);
    expect(shouldScrollAfterImportPaste('', 'A'.repeat(100))).toBe(false);
  });
});
