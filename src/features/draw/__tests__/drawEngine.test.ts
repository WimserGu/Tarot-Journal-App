import { describe, expect, it } from 'vitest';

import { tarotCards } from '../../../domain/tarotCards';
import { ValidationRepositoryError } from '../../../repositories/repositoryErrors';
import { DefaultDrawEngine, type RandomProvider, type TimeProvider } from '../drawEngine';
import type { DrawConfiguration } from '../drawTypes';

class SequenceRandom implements RandomProvider {
  private index = 0;
  constructor(private readonly values: readonly number[]) {}
  next(): number {
    const value = this.values[this.index];
    if (value === undefined) throw new Error('Random sequence exhausted.');
    this.index += 1;
    return value;
  }
}

class FixedTime implements TimeProvider {
  now() {
    return '2026-07-13T10:00:00.000Z';
  }
}

const engine = new DefaultDrawEngine();
const config = (value: Partial<DrawConfiguration> = {}): DrawConfiguration => ({
  cardCount: 1,
  reversalMode: 'standard',
  reversedProbability: 0.5,
  overexpressedProbabilityWhenReversed: 0.5,
  ...value,
});

describe('DrawEngine', () => {
  it('draws only upright cards when reversals are disabled', () => {
    const result = engine.draw(
      tarotCards,
      config({ cardCount: 3, reversalMode: 'disabled' }),
      new SequenceRandom([0, 0, 0]),
    );
    expect(result.cards.map((card) => card.orientation)).toEqual(['upright', 'upright', 'upright']);
  });

  it('creates upright and ordinary reversed cards in standard mode', () => {
    const result = engine.draw(
      tarotCards,
      config({ cardCount: 2 }),
      new SequenceRandom([0, 0.2, 0, 0.8]),
    );
    expect(result.cards.map((card) => [card.orientation, card.reversalExpression])).toEqual([
      ['reversed', null],
      ['upright', null],
    ]);
  });

  it('creates underexpressed and overexpressed reversed cards in expression mode', () => {
    const result = engine.draw(
      tarotCards,
      config({ cardCount: 2, reversalMode: 'expression' }),
      new SequenceRandom([0, 0, 0.8, 0, 0, 0.2]),
    );
    expect(result.cards.map((card) => card.reversalExpression)).toEqual([
      'underexpressed',
      'overexpressed',
    ]);
  });

  it('respects reversed probability zero', () => {
    expect(
      engine.draw(tarotCards, config({ reversedProbability: 0 }), new SequenceRandom([0, 0]))
        .cards[0]?.orientation,
    ).toBe('upright');
  });

  it('respects reversed probability one', () => {
    expect(
      engine.draw(tarotCards, config({ reversedProbability: 1 }), new SequenceRandom([0, 0.999]))
        .cards[0]?.orientation,
    ).toBe('reversed');
  });

  it('is deterministic for a fixed provider sequence', () => {
    const values = [0.25, 0.25, 0.5, 0.75];
    expect(
      engine.draw(
        tarotCards,
        config({ cardCount: 2 }),
        new SequenceRandom(values),
        new FixedTime(),
      ),
    ).toEqual(
      engine.draw(
        tarotCards,
        config({ cardCount: 2 }),
        new SequenceRandom(values),
        new FixedTime(),
      ),
    );
  });

  it('returns the effective configuration and creation time', () => {
    const configuration = config({ reversalMode: 'disabled' });
    const result = engine.draw(tarotCards, configuration, new SequenceRandom([0]), new FixedTime());

    expect(result.configuration).toEqual(configuration);
    expect(result.createdAt).toBe('2026-07-13T10:00:00.000Z');
  });

  it('never repeats a card in one result', () => {
    const cards = engine.draw(
      tarotCards,
      config({ cardCount: 10, reversalMode: 'disabled' }),
      new SequenceRandom(Array(10).fill(0)),
    ).cards;
    expect(new Set(cards.map((card) => card.tarotCardId)).size).toBe(10);
  });

  it('can draw the entire available deck', () => {
    const deck = tarotCards.slice(0, 10);
    expect(
      engine.draw(
        deck,
        config({ cardCount: 10, reversalMode: 'disabled' }),
        new SequenceRandom(Array(10).fill(0)),
      ).cards,
    ).toHaveLength(10);
  });

  it('rejects card counts larger than the deck', () => {
    expect(() =>
      engine.draw(tarotCards.slice(0, 2), config({ cardCount: 3 }), new SequenceRandom([])),
    ).toThrow(ValidationRepositoryError);
  });

  it.each([-0.1, 1.1, Number.NaN])('rejects invalid reversed probability %s', (probability) => {
    expect(() =>
      engine.draw(tarotCards, config({ reversedProbability: probability }), new SequenceRandom([])),
    ).toThrow(ValidationRepositoryError);
  });

  it('rejects an empty deck', () => {
    expect(() => engine.draw([], config(), new SequenceRandom([]))).toThrow(
      ValidationRepositoryError,
    );
  });

  it('returns continuous zero-based position indexes', () => {
    const cards = engine.draw(
      tarotCards,
      config({ cardCount: 3, reversalMode: 'disabled' }),
      new SequenceRandom([0, 0, 0]),
    ).cards;
    expect(cards.map((card) => card.positionIndex)).toEqual([0, 1, 2]);
  });

  it('never attaches an expression to an upright card', () => {
    const cards = engine.draw(
      tarotCards,
      config({ cardCount: 3, reversalMode: 'expression', reversedProbability: 0 }),
      new SequenceRandom([0, 0.9, 0, 0.9, 0, 0.9]),
    ).cards;
    expect(
      cards.every((card) => card.orientation === 'upright' && card.reversalExpression === null),
    ).toBe(true);
  });

  it('rejects invalid random provider output', () => {
    expect(() => engine.draw(tarotCards, config(), new SequenceRandom([1]))).toThrow(
      ValidationRepositoryError,
    );
  });
});
