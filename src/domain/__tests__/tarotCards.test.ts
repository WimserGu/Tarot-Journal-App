import { describe, expect, it } from 'vitest';

import { tarotCards } from '../tarotCards';
import { findTarotCardByName } from '../readingUtils';

describe('tarotCards', () => {
  it('contains all 78 standard cards with stable unique identifiers', () => {
    expect(tarotCards).toHaveLength(78);
    expect(new Set(tarotCards.map((card) => card.card_key)).size).toBe(78);
    expect(new Set(tarotCards.map((card) => card.id)).size).toBe(78);
    expect(tarotCards.filter((card) => card.arcana === 'major')).toHaveLength(22);
    expect(tarotCards.filter((card) => card.arcana === 'minor')).toHaveLength(56);
  });

  it('keeps major arcana suitless and minor arcana assigned to a suit', () => {
    const majorCards = tarotCards.filter((card) => card.arcana === 'major');
    const minorCards = tarotCards.filter((card) => card.arcana === 'minor');

    expect(majorCards.every((card) => card.suit === null)).toBe(true);
    expect(minorCards.every((card) => card.suit !== null)).toBe(true);
  });

  it('uses the agreed Chinese names for the Fool, minor aces, and minor queens', () => {
    expect(tarotCards.find((card) => card.card_key === 'major_fool')?.name_zh).toBe('愚人');
    expect(tarotCards.find((card) => card.card_key === 'major_hermit')?.name_zh).toBe('隐士');
    expect(
      tarotCards.filter((card) => card.rank_code === 'ace').map((card) => card.name_zh),
    ).toEqual(['权杖首牌', '圣杯首牌', '宝剑首牌', '星币首牌']);
    expect(
      tarotCards.filter((card) => card.rank_code === 'queen').map((card) => card.name_zh),
    ).toEqual(['权杖王后', '圣杯王后', '宝剑王后', '星币王后']);
  });

  it('keeps the complete 78-card Chinese catalog on the agreed naming standard', () => {
    const majorNames = [
      '愚人',
      '魔术师',
      '女祭司',
      '皇后',
      '皇帝',
      '教皇',
      '恋人',
      '战车',
      '力量',
      '隐士',
      '命运之轮',
      '正义',
      '倒吊人',
      '死神',
      '节制',
      '恶魔',
      '高塔',
      '星星',
      '月亮',
      '太阳',
      '审判',
      '世界',
    ];
    const minorRanks = [
      '首牌',
      '二',
      '三',
      '四',
      '五',
      '六',
      '七',
      '八',
      '九',
      '十',
      '侍从',
      '骑士',
      '王后',
      '国王',
    ];
    const minorNames = ['权杖', '圣杯', '宝剑', '星币'].flatMap((suit) =>
      minorRanks.map((rank) => `${suit}${rank}`),
    );

    expect(tarotCards.map((card) => card.name_zh)).toEqual([...majorNames, ...minorNames]);
  });

  it('finds a card by Chinese name, English name, or stable key', () => {
    expect(findTarotCardByName('宝剑八')?.card_key).toBe('swords_eight');
    expect(findTarotCardByName('the sun')?.card_key).toBe('major_sun');
    expect(findTarotCardByName('pentacles_eight')?.name_zh).toBe('星币八');
  });

  it('returns undefined for an empty or unknown card name', () => {
    expect(findTarotCardByName('')).toBeUndefined();
    expect(findTarotCardByName('不存在的牌')).toBeUndefined();
  });

  it.each([
    ['愚者', 'major_fool'],
    ['隐者', 'major_hermit'],
    ['星币一', 'pentacles_ace'],
    ['星币皇后', 'pentacles_queen'],
    ['金币国王', 'pentacles_king'],
    ['钱币侍者', 'pentacles_page'],
    ['女教皇', 'major_high_priestess'],
    ['吊人', 'major_hanged_man'],
    ['Fool', 'major_fool'],
  ])('resolves the exact known alias %s', (alias, expectedCardKey) => {
    expect(findTarotCardByName(alias)?.card_key).toBe(expectedCardKey);
  });
});
