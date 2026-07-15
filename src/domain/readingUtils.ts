import { tarotCards } from './tarotCards';
import type { Reading, ReadingQuery, TarotCard } from './types';

function normalizeCardName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

const exactCardNameAliases: Readonly<Record<string, string>> = {
  愚者: '愚人',
  女教皇: '女祭司',
  教宗: '教皇',
  吊人: '倒吊人',
  隐者: '隐士',
};

function cardNameCandidates(value: string): ReadonlySet<string> {
  const normalized = normalizeCardName(value);
  const canonicalChineseName = (exactCardNameAliases[normalized] ?? normalized)
    .replace(/^金币/, '星币')
    .replace(/^钱币/, '星币')
    .replace(/侍者$/, '侍从')
    .replace(/^(权杖|圣杯|宝剑|星币)一$/, '$1首牌')
    .replace(/^(权杖|圣杯|宝剑|星币)(皇后|女王)$/, '$1王后');
  const withoutEnglishArticle = normalized.startsWith('the') ? normalized.slice(3) : normalized;

  return new Set([normalized, canonicalChineseName, withoutEnglishArticle]);
}

/** Finds a card by its stable key, Chinese name, or English display name. */
export function findTarotCardByName(
  name: string,
  cards: readonly TarotCard[] = tarotCards,
): TarotCard | undefined {
  const normalizedName = normalizeCardName(name);

  if (normalizedName.length === 0) {
    return undefined;
  }

  const nameCandidates = cardNameCandidates(name);

  return cards.find((card) => {
    return [card.card_key, card.name_zh, card.name_en].some((value) => {
      const cardCandidates = cardNameCandidates(value);
      return [...nameCandidates].some((candidate) => cardCandidates.has(candidate));
    });
  });
}

/** Finds cards whose stable key or display names contain the search query. */
export function searchTarotCards(
  query: string,
  cards: readonly TarotCard[] = tarotCards,
): TarotCard[] {
  const normalizedQuery = normalizeCardName(query);
  const sortedCards = [...cards].sort((first, second) => first.sort_order - second.sort_order);

  if (normalizedQuery.length === 0) {
    return sortedCards;
  }

  return sortedCards.filter((card) => {
    return [card.card_key, card.name_zh, card.name_en].some((value) => {
      return normalizeCardName(value).includes(normalizedQuery);
    });
  });
}

function parseDateBoundary(value: string, boundary: 'start' | 'end'): number {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const input = dateOnly
    ? `${value}T${boundary === 'start' ? '00:00:00.000Z' : '23:59:59.999Z'}`
    : value;
  const timestamp = Date.parse(input);

  if (Number.isNaN(timestamp)) {
    throw new RangeError(`Invalid date filter: ${value}`);
  }

  return timestamp;
}

/**
 * Filters records with inclusive date bounds. Date-only bounds are interpreted
 * as the complete UTC day, while ISO date-time values are compared exactly.
 */
export function filterReadings(readings: readonly Reading[], query: ReadingQuery = {}): Reading[] {
  const dateFrom = query.date_from ? parseDateBoundary(query.date_from, 'start') : undefined;
  const dateTo = query.date_to ? parseDateBoundary(query.date_to, 'end') : undefined;

  if (dateFrom !== undefined && dateTo !== undefined && dateFrom > dateTo) {
    throw new RangeError('date_from must be before or equal to date_to.');
  }

  return readings.filter((reading) => {
    if (query.topic_id !== undefined && reading.topic_id !== query.topic_id) {
      return false;
    }

    if (
      query.question_template_id !== undefined &&
      reading.question_template_id !== query.question_template_id
    ) {
      return false;
    }

    if (
      query.question_text !== undefined &&
      reading.question_text_snapshot !== query.question_text
    ) {
      return false;
    }

    const readingTimestamp = Date.parse(reading.reading_at);

    if (Number.isNaN(readingTimestamp)) {
      return false;
    }

    if (dateFrom !== undefined && readingTimestamp < dateFrom) {
      return false;
    }

    return dateTo === undefined || readingTimestamp <= dateTo;
  });
}
