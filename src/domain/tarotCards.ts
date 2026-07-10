import type {
  MajorArcanaRank,
  MinorArcanaRank,
  TarotCard,
  TarotRankCode,
  TarotSuit,
} from './types';

type MajorCardSeed = {
  card_key: string;
  name_zh: string;
  name_en: string;
  rank_code: MajorArcanaRank;
  rank_order: number;
};

type MinorRankSeed = {
  rank_code: MinorArcanaRank;
  name_zh_suffix: string;
  name_en: string;
  rank_order: number;
};

type MinorSuitSeed = {
  suit: TarotSuit;
  name_zh: string;
  name_en: string;
  start_id: number;
};

const majorCardSeeds: readonly MajorCardSeed[] = [
  { card_key: 'major_fool', name_zh: '愚者', name_en: 'The Fool', rank_code: '0', rank_order: 0 },
  {
    card_key: 'major_magician',
    name_zh: '魔术师',
    name_en: 'The Magician',
    rank_code: '1',
    rank_order: 1,
  },
  {
    card_key: 'major_high_priestess',
    name_zh: '女祭司',
    name_en: 'The High Priestess',
    rank_code: '2',
    rank_order: 2,
  },
  {
    card_key: 'major_empress',
    name_zh: '皇后',
    name_en: 'The Empress',
    rank_code: '3',
    rank_order: 3,
  },
  {
    card_key: 'major_emperor',
    name_zh: '皇帝',
    name_en: 'The Emperor',
    rank_code: '4',
    rank_order: 4,
  },
  {
    card_key: 'major_hierophant',
    name_zh: '教皇',
    name_en: 'The Hierophant',
    rank_code: '5',
    rank_order: 5,
  },
  {
    card_key: 'major_lovers',
    name_zh: '恋人',
    name_en: 'The Lovers',
    rank_code: '6',
    rank_order: 6,
  },
  {
    card_key: 'major_chariot',
    name_zh: '战车',
    name_en: 'The Chariot',
    rank_code: '7',
    rank_order: 7,
  },
  {
    card_key: 'major_strength',
    name_zh: '力量',
    name_en: 'Strength',
    rank_code: '8',
    rank_order: 8,
  },
  {
    card_key: 'major_hermit',
    name_zh: '隐者',
    name_en: 'The Hermit',
    rank_code: '9',
    rank_order: 9,
  },
  {
    card_key: 'major_wheel_of_fortune',
    name_zh: '命运之轮',
    name_en: 'Wheel of Fortune',
    rank_code: '10',
    rank_order: 10,
  },
  {
    card_key: 'major_justice',
    name_zh: '正义',
    name_en: 'Justice',
    rank_code: '11',
    rank_order: 11,
  },
  {
    card_key: 'major_hanged_man',
    name_zh: '倒吊人',
    name_en: 'The Hanged Man',
    rank_code: '12',
    rank_order: 12,
  },
  { card_key: 'major_death', name_zh: '死神', name_en: 'Death', rank_code: '13', rank_order: 13 },
  {
    card_key: 'major_temperance',
    name_zh: '节制',
    name_en: 'Temperance',
    rank_code: '14',
    rank_order: 14,
  },
  {
    card_key: 'major_devil',
    name_zh: '恶魔',
    name_en: 'The Devil',
    rank_code: '15',
    rank_order: 15,
  },
  {
    card_key: 'major_tower',
    name_zh: '高塔',
    name_en: 'The Tower',
    rank_code: '16',
    rank_order: 16,
  },
  { card_key: 'major_star', name_zh: '星星', name_en: 'The Star', rank_code: '17', rank_order: 17 },
  { card_key: 'major_moon', name_zh: '月亮', name_en: 'The Moon', rank_code: '18', rank_order: 18 },
  { card_key: 'major_sun', name_zh: '太阳', name_en: 'The Sun', rank_code: '19', rank_order: 19 },
  {
    card_key: 'major_judgement',
    name_zh: '审判',
    name_en: 'Judgement',
    rank_code: '20',
    rank_order: 20,
  },
  {
    card_key: 'major_world',
    name_zh: '世界',
    name_en: 'The World',
    rank_code: '21',
    rank_order: 21,
  },
];

const minorRankSeeds: readonly MinorRankSeed[] = [
  { rank_code: 'ace', name_zh_suffix: '一', name_en: 'Ace', rank_order: 1 },
  { rank_code: 'two', name_zh_suffix: '二', name_en: 'Two', rank_order: 2 },
  { rank_code: 'three', name_zh_suffix: '三', name_en: 'Three', rank_order: 3 },
  { rank_code: 'four', name_zh_suffix: '四', name_en: 'Four', rank_order: 4 },
  { rank_code: 'five', name_zh_suffix: '五', name_en: 'Five', rank_order: 5 },
  { rank_code: 'six', name_zh_suffix: '六', name_en: 'Six', rank_order: 6 },
  { rank_code: 'seven', name_zh_suffix: '七', name_en: 'Seven', rank_order: 7 },
  { rank_code: 'eight', name_zh_suffix: '八', name_en: 'Eight', rank_order: 8 },
  { rank_code: 'nine', name_zh_suffix: '九', name_en: 'Nine', rank_order: 9 },
  { rank_code: 'ten', name_zh_suffix: '十', name_en: 'Ten', rank_order: 10 },
  { rank_code: 'page', name_zh_suffix: '侍从', name_en: 'Page', rank_order: 11 },
  { rank_code: 'knight', name_zh_suffix: '骑士', name_en: 'Knight', rank_order: 12 },
  { rank_code: 'queen', name_zh_suffix: '皇后', name_en: 'Queen', rank_order: 13 },
  { rank_code: 'king', name_zh_suffix: '国王', name_en: 'King', rank_order: 14 },
];

const minorSuitSeeds: readonly MinorSuitSeed[] = [
  { suit: 'wands', name_zh: '权杖', name_en: 'Wands', start_id: 22 },
  { suit: 'cups', name_zh: '圣杯', name_en: 'Cups', start_id: 36 },
  { suit: 'swords', name_zh: '宝剑', name_en: 'Swords', start_id: 50 },
  { suit: 'pentacles', name_zh: '星币', name_en: 'Pentacles', start_id: 64 },
];

function toTarotCard(card: MajorCardSeed): TarotCard {
  return {
    id: card.rank_order,
    card_key: card.card_key,
    name_zh: card.name_zh,
    name_en: card.name_en,
    arcana: 'major',
    suit: null,
    rank_code: card.rank_code,
    rank_order: card.rank_order,
    sort_order: card.rank_order,
  };
}

function toMinorTarotCard(suit: MinorSuitSeed, rank: MinorRankSeed): TarotCard {
  const id = suit.start_id + rank.rank_order - 1;

  return {
    id,
    card_key: `${suit.suit}_${rank.rank_code}`,
    name_zh: `${suit.name_zh}${rank.name_zh_suffix}`,
    name_en: `${rank.name_en} of ${suit.name_en}`,
    arcana: 'minor',
    suit: suit.suit,
    rank_code: rank.rank_code as TarotRankCode,
    rank_order: rank.rank_order,
    sort_order: id,
  };
}

/** Complete canonical Rider-Waite-Smith-compatible 78-card metadata. */
export const tarotCards: readonly TarotCard[] = [
  ...majorCardSeeds.map(toTarotCard),
  ...minorSuitSeeds.flatMap((suit) => minorRankSeeds.map((rank) => toMinorTarotCard(suit, rank))),
];
