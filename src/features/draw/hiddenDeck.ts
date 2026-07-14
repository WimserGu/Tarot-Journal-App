import type { TarotCard } from '../../domain/types';
import type { DrawSession } from './drawTypes';

export function createHiddenDeck(cards: readonly TarotCard[], random = Math.random): number[] {
  const ids = cards.map((card) => card.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(random() * (index + 1));
    [ids[index], ids[selected]] = [ids[selected]!, ids[index]!];
  }
  return ids;
}

export function remainingHiddenDeck(session: DrawSession): number[] {
  const selected = new Set(session.cards.map((card) => card.tarotCardId));
  return (session.configuration.hiddenDeckCardIds ?? []).filter((id) => !selected.has(id));
}
