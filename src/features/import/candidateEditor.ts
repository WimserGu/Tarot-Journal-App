import type { ImportCardCandidate, ImportReadingCandidate } from './importParser';
import { tarotCards } from '../../domain/tarotCards';
function normalize(candidate: ImportReadingCandidate): ImportReadingCandidate {
  const cards = candidate.cards.map((card) => ({
    ...card,
    reversalExpression: card.orientation === 'upright' ? null : card.reversalExpression,
  }));
  const blocked =
    !candidate.date ||
    !candidate.question.trim() ||
    !cards.length ||
    cards.some(
      (card) =>
        card.tarotCardId === null ||
        card.orientation === null ||
        (card.orientation === 'upright' && card.reversalExpression),
    );
  return { ...candidate, cards, isValid: !blocked && candidate.warnings.length === 0 };
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
        reversalExpression: null,
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
