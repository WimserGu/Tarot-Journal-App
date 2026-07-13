import { describe, expect, it } from 'vitest';
import { ValidationRepositoryError } from '../../../repositories/repositoryErrors';
import { BUILT_IN_SPREADS, BuiltInSpreadRepository, validateSpread } from '../spreadRepository';

describe('built-in SpreadRepository', () => {
  const repository = new BuiltInSpreadRepository();
  it('exposes exactly the four immutable Phase 1 spreads', () => {
    expect(repository.listSpreads().map((spread) => spread.id)).toEqual([
      'single-card',
      'three-cards',
      'situation',
      'open',
    ]);
    expect(Object.isFrozen(BUILT_IN_SPREADS)).toBe(true);
  });
  it('resolves ordered semantic positions', () => {
    expect(repository.resolveSpread('three-cards').positions.map((p) => p.title)).toEqual([
      'Past',
      'Present',
      'Future',
    ]);
  });
  it('creates neutral positions for an open spread', () => {
    expect(repository.resolveSpread('open', 3).positions.map((p) => [p.id, p.title])).toEqual([
      ['open.card.1', 'Card 1'],
      ['open.card.2', 'Card 2'],
      ['open.card.3', 'Card 3'],
    ]);
  });
  it.each([
    {
      id: 'bad',
      name: 'Bad',
      description: '',
      isOpen: false,
      positions: [{ id: 'x', order: 1, title: '', description: '' }],
    },
    {
      id: 'bad',
      name: 'Bad',
      description: '',
      isOpen: false,
      positions: [{ id: 'x', order: -1, title: 'X', description: '' }],
    },
    {
      id: 'bad',
      name: 'Bad',
      description: '',
      isOpen: false,
      positions: [
        { id: 'x', order: 1, title: 'X', description: '' },
        { id: 'x', order: 2, title: 'Y', description: '' },
      ],
    },
    {
      id: 'bad',
      name: 'Bad',
      description: '',
      isOpen: false,
      positions: [
        { id: 'x', order: 1, title: 'X', description: '' },
        { id: 'y', order: 1, title: 'Y', description: '' },
      ],
    },
  ])('rejects invalid definitions', (spread) => {
    expect(() => validateSpread(spread)).toThrow(ValidationRepositoryError);
  });
});
