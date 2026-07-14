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
    expect(IMPORT_AI_PROMPT).not.toContain('underexpressed');
    expect(IMPORT_AI_PROMPT).not.toContain('overexpressed');
  });
});
