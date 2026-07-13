import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import { SPREAD_IDS, type Spread, type SpreadPosition } from './spreadTypes';

const position = (id: string, order: number, title: string, description: string): SpreadPosition =>
  Object.freeze({ id, order, title, description });

function defineSpread(value: Omit<Spread, 'positions'> & { positions: SpreadPosition[] }): Spread {
  return Object.freeze({ ...value, positions: Object.freeze(value.positions) });
}

export function validateSpread(spread: Spread): Spread {
  if (!spread.id.trim() || !spread.name.trim())
    throw new ValidationRepositoryError('Spread id and name are required.', 'validateSpread');
  const ids = new Set<string>();
  const orders = new Set<number>();
  spread.positions.forEach((item) => {
    if (!item.id.trim() || !item.title.trim())
      throw new ValidationRepositoryError(
        'Spread positions require ids and titles.',
        'validateSpread',
      );
    if (!Number.isInteger(item.order) || item.order < 1)
      throw new ValidationRepositoryError(
        'Spread position order must be positive.',
        'validateSpread',
      );
    if (ids.has(item.id) || orders.has(item.order))
      throw new ValidationRepositoryError(
        'Spread position ids and orders must be unique.',
        'validateSpread',
      );
    ids.add(item.id);
    orders.add(item.order);
  });
  if (!spread.isOpen) {
    spread.positions.forEach((_, index) => {
      if (!orders.has(index + 1))
        throw new ValidationRepositoryError(
          'Spread position order must be continuous.',
          'validateSpread',
        );
    });
  }
  return spread;
}

export const BUILT_IN_SPREADS: readonly Spread[] = Object.freeze(
  [
    defineSpread({
      id: SPREAD_IDS.singleCard,
      name: '单张牌',
      description: '一次简短的当下回看。',
      isOpen: false,
      positions: [position('single-card.reflection', 1, 'Reflection', 'A focused reflection.')],
    }),
    defineSpread({
      id: SPREAD_IDS.threeCards,
      name: '三张牌',
      description: '过去、现在与可能的未来方向。',
      isOpen: false,
      positions: [
        position('three-cards.past', 1, 'Past', 'What led here.'),
        position('three-cards.present', 2, 'Present', 'Current situation.'),
        position('three-cards.future', 3, 'Future', 'Possible direction.'),
      ],
    }),
    defineSpread({
      id: SPREAD_IDS.situation,
      name: '情境牌阵',
      description: '情境、挑战与建议。',
      isOpen: false,
      positions: [
        position('situation.situation', 1, 'Situation', 'The situation being considered.'),
        position('situation.challenge', 2, 'Challenge', 'The challenge present.'),
        position('situation.advice', 3, 'Advice', 'A point to consider.'),
      ],
    }),
    defineSpread({
      id: SPREAD_IDS.open,
      name: '开放牌阵',
      description: '只记录牌序，不附加语义。',
      isOpen: true,
      positions: [],
    }),
  ].map(validateSpread),
);

export interface SpreadRepository {
  listSpreads(): readonly Spread[];
  getSpread(id: string): Spread | null;
  resolveSpread(id: string, openCardCount?: number): Spread;
}

export class BuiltInSpreadRepository implements SpreadRepository {
  listSpreads(): readonly Spread[] {
    return BUILT_IN_SPREADS;
  }
  getSpread(id: string): Spread | null {
    return BUILT_IN_SPREADS.find((spread) => spread.id === id) ?? null;
  }
  resolveSpread(id: string, openCardCount?: number): Spread {
    const spread = this.getSpread(id);
    if (!spread) throw new ValidationRepositoryError('Spread does not exist.', 'resolveSpread');
    if (!spread.isOpen) return spread;
    if (!Number.isInteger(openCardCount) || (openCardCount ?? 0) < 1 || openCardCount! > 10)
      throw new ValidationRepositoryError(
        'Open spread card count must be between 1 and 10.',
        'resolveSpread',
      );
    return defineSpread({
      ...spread,
      positions: Array.from({ length: openCardCount! }, (_, index) =>
        position(`open.card.${index + 1}`, index + 1, `Card ${index + 1}`, ''),
      ),
    });
  }
}

export const spreadRepository: SpreadRepository = new BuiltInSpreadRepository();
