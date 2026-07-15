import type { ImportCardCandidate, ImportReadingCandidate } from './importParser';
import { tarotCards } from '../../domain/tarotCards';

const cardWarningCodes = new Set([
  'invalid_cards',
  'malformed_card',
  'unknown_card',
  'upright_variant',
]);

function normalize(candidate: ImportReadingCandidate): ImportReadingCandidate {
  const cards = candidate.cards.map((card) => ({
    ...card,
    reversalVariant: card.orientation === 'upright' ? null : card.reversalVariant,
  }));
  const hasInvalidCard = cards.some(
    (card) =>
      card.tarotCardId === null ||
      card.orientation === null ||
      (card.orientation === 'upright' && card.reversalVariant !== null),
  );
  const warnings = [
    ...candidate.warnings.filter((warning) => !cardWarningCodes.has(warning.code)),
    ...(hasInvalidCard
      ? [{ code: 'invalid_cards', message: '存在未解决的牌面错误。', field: 'Cards' }]
      : []),
  ];
  const blocked =
    !candidate.date ||
    !candidate.question.trim() ||
    !cards.length ||
    cards.some(
      (card) =>
        card.tarotCardId === null ||
        card.orientation === null ||
        (card.orientation === 'upright' && card.reversalVariant),
    );
  return { ...candidate, cards, warnings, isValid: !blocked && warnings.length === 0 };
}
export const editCandidate = (
  candidate: ImportReadingCandidate,
  patch: Partial<ImportReadingCandidate>,
) => normalize({ ...candidate, ...patch });
export const editCard = (
  candidate: ImportReadingCandidate,
  index: number,
  patch: Partial<ImportCardCandidate>,
) =>
  normalize({
    ...candidate,
    cards: candidate.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)),
  });
export const addCard = (candidate: ImportReadingCandidate) =>
  normalize({
    ...candidate,
    cards: [
      ...candidate.cards,
      {
        tarotCardId: tarotCards[0]!.id,
        rawCardName: tarotCards[0]!.name_zh,
        orientation: 'upright',
        reversalVariant: null,
        warnings: [],
      },
    ],
  });
export const deleteCard = (candidate: ImportReadingCandidate, index: number) =>
  normalize({ ...candidate, cards: candidate.cards.filter((_, i) => i !== index) });
export const moveCard = (candidate: ImportReadingCandidate, index: number, direction: -1 | 1) => {
  const target = index + direction;
  if (target < 0 || target >= candidate.cards.length) return candidate;
  const cards = [...candidate.cards];
  [cards[index], cards[target]] = [cards[target]!, cards[index]!];
  return normalize({ ...candidate, cards });
};
