import { describe, expect, it } from 'vitest';

import { tarotCards } from '../../../domain/tarotCards';
import { IMPORT_AI_PROMPT, parseImportText } from '../importParser';

const cardName = tarotCards[0]!.name_zh;
const block = (cardLine: string) =>
  `[Reading]\nDate: 2026-07-14\nTopic: 关系\nQuestion: 今天需要观察什么？\nCards:\n- ${cardLine}\nNotes:`;

describe('dual reversal import format', () => {
  it.each([
    [`${cardName} | upright`, 'upright', null],
    [`${cardName} | reversed`, 'reversed', null],
    [`${cardName} | reversed | left`, 'reversed', 'left'],
    [`${cardName} | reversed | right`, 'reversed', 'right'],
  ] as const)('parses %s', (line, orientation, reversalVariant) => {
    const result = parseImportText(block(line));
    expect(result.readings[0]?.cards[0]).toMatchObject({ orientation, reversalVariant });
    expect(result.readings[0]?.isValid).toBe(true);
  });

  it('blocks upright variants and rejects legacy semantic tokens', () => {
    expect(parseImportText(block(`${cardName} | upright | left`)).readings[0]?.isValid).toBe(false);
    expect(
      parseImportText(block(`${cardName} | reversed | underexpressed`)).readings[0]?.cards[0]
        ?.orientation,
    ).toBeNull();
  });

  it('instructs external formatting without inferring left or right', () => {
    expect(IMPORT_AI_PROMPT).toContain('reversed | left');
    expect(IMPORT_AI_PROMPT).toContain('reversed | right');
    expect(IMPORT_AI_PROMPT).toContain('不得根据牌义猜测左右');
    expect(IMPORT_AI_PROMPT).toContain('“愚人”“隐士”“首牌”“侍从”“王后”“国王”');
    expect(IMPORT_AI_PROMPT).not.toContain('underexpressed');
    expect(IMPORT_AI_PROMPT).not.toContain('overexpressed');
  });

  it.each([
    ['The Fool', 'major_fool'],
    [' the   fool ', 'major_fool'],
    ['major_fool', 'major_fool'],
    ['宝 剑 八', 'swords_eight'],
  ])('recognizes deterministic card name form %s', (name, expectedCardKey) => {
    const result = parseImportText(block(`${name} | upright`));
    const expectedCard = tarotCards.find((card) => card.card_key === expectedCardKey);

    expect(result.readings[0]?.cards[0]?.tarotCardId).toBe(expectedCard?.id);
    expect(result.readings[0]?.cards[0]?.warnings).toEqual([]);
    expect(result.readings[0]?.isValid).toBe(true);
  });

  it('still blocks a genuinely unknown card name', () => {
    const result = parseImportText(block('不存在的牌 | upright'));

    expect(result.readings[0]?.cards[0]?.tarotCardId).toBeNull();
    expect(result.readings[0]?.cards[0]?.warnings).toContainEqual(
      expect.objectContaining({ code: 'unknown_card' }),
    );
    expect(result.readings[0]?.warnings.map((warning) => warning.code)).toEqual(['invalid_cards']);
    expect(result.readings[0]?.isValid).toBe(false);
  });

  it('recognizes 愚人 as the canonical Fool card name', () => {
    const result = parseImportText(block('愚人 | upright'));
    const fool = tarotCards.find((card) => card.card_key === 'major_fool');

    expect(result.readings[0]?.cards[0]?.tarotCardId).toBe(fool?.id);
    expect(result.readings[0]?.warnings).toEqual([]);
    expect(result.readings[0]?.cards[0]?.warnings).toEqual([]);
    expect(result.readings[0]?.isValid).toBe(true);
  });

  it('parses a Reading containing 愚人, 宝剑侍从, and 星币十 without card warnings', () => {
    const result = parseImportText(`[Reading]
Date: 2026-07-11
Topic:
Question: 她想坦白的是什么
Cards:
- 愚人 | upright
- 宝剑侍从 | reversed
- 星币十 | reversed
Notes:`);

    expect(result.readings[0]?.cards.map((card) => card.tarotCardId)).toEqual([
      tarotCards.find((card) => card.card_key === 'major_fool')?.id,
      tarotCards.find((card) => card.card_key === 'swords_page')?.id,
      tarotCards.find((card) => card.card_key === 'pentacles_ten')?.id,
    ]);
    expect(result.readings[0]?.warnings).toEqual([]);
    expect(result.readings[0]?.cards.flatMap((card) => card.warnings)).toEqual([]);
    expect(result.readings[0]?.isValid).toBe(true);
  });
});
