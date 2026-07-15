import { describe, expect, it } from 'vitest';

import { tarotCards } from '../../../domain/tarotCards';
import { editCard } from '../candidateEditor';
import { parseImportText } from '../importParser';

describe('import candidate card correction', () => {
  it('clears stale unknown-card warnings after the user selects a known card', () => {
    const parsed = parseImportText(`[Reading]
Date: 2026-07-14
Topic: 关系
Question: 今天需要观察什么？
Cards:
- 不存在的牌 | upright
Notes:`);
    const candidate = parsed.readings[0]!;
    const replacement = tarotCards.find((card) => card.card_key === 'major_fool')!;

    const corrected = editCard(candidate, 0, {
      tarotCardId: replacement.id,
      rawCardName: replacement.name_zh,
      warnings: [],
    });

    expect(corrected.cards[0]).toMatchObject({
      tarotCardId: replacement.id,
      rawCardName: replacement.name_zh,
      warnings: [],
    });
    expect(corrected.warnings.map((warning) => warning.code)).not.toContain('unknown_card');
    expect(corrected.warnings.map((warning) => warning.code)).not.toContain('invalid_cards');
    expect(corrected.isValid).toBe(true);
  });
});
