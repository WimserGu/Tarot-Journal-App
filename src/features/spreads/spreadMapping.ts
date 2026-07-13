import type { ReadingCardFormValue } from '../readings/readingSchema';
import { spreadRepository } from './spreadRepository';
import type { Spread } from './spreadTypes';

export function cardsForSpread(spread: Spread, cards: readonly ReadingCardFormValue[] = []) {
  return spread.positions.map((position, index): ReadingCardFormValue => {
    const current = cards[index];
    return {
      tarot_card_id: current?.tarot_card_id ?? null,
      position_name: position.title,
      orientation: current?.orientation ?? 'upright',
      reversalExpression: current?.reversalExpression ?? null,
      source: current?.source ?? 'manual',
      drawSessionId: current?.drawSessionId ?? null,
      spreadPositionId: position.id,
    };
  });
}

export function resolveFormSpread(spreadId: string, cardCount: number): Spread {
  return spreadRepository.resolveSpread(spreadId, spreadId === 'open' ? cardCount : undefined);
}
