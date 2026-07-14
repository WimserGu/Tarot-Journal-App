import type { ISODateTime, TarotCard } from '../../domain/types';
import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import type { DrawConfiguration, DrawResult } from './drawTypes';

export interface RandomProvider {
  next(): number;
}

export interface TimeProvider {
  now(): ISODateTime;
}

export class MathRandomProvider implements RandomProvider {
  next(): number {
    return Math.random();
  }
}

export class SystemTimeProvider implements TimeProvider {
  now(): ISODateTime {
    return new Date().toISOString();
  }
}

export interface DrawEngine {
  draw(
    deck: readonly TarotCard[],
    configuration: DrawConfiguration,
    randomProvider?: RandomProvider,
    timeProvider?: TimeProvider,
  ): DrawResult;
}

function validateProbability(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new ValidationRepositoryError(`${field} must be between 0 and 1.`, 'draw');
  }
}

export function validateDrawConfiguration(
  configuration: DrawConfiguration,
  deckSize?: number,
): DrawConfiguration {
  if (!Number.isInteger(configuration.cardCount) || configuration.cardCount < 1) {
    throw new ValidationRepositoryError('Card count must be at least 1.', 'draw');
  }
  if (configuration.cardCount > 10) {
    throw new ValidationRepositoryError('Card count cannot exceed 10.', 'draw');
  }
  if (
    !configuration.spreadId.trim() ||
    configuration.spreadPositionIds.length !== configuration.cardCount ||
    new Set(configuration.spreadPositionIds).size !== configuration.cardCount
  ) {
    throw new ValidationRepositoryError('Spread positions must match card count.', 'draw');
  }
  if (deckSize !== undefined && configuration.cardCount > deckSize) {
    throw new ValidationRepositoryError('Card count cannot exceed the available deck.', 'draw');
  }
  if (!['disabled', 'standard', 'dual'].includes(configuration.reversalMode)) {
    throw new ValidationRepositoryError('Reversal mode is invalid.', 'draw');
  }
  validateProbability(configuration.reversedProbability, 'Reversed probability');
  validateProbability(configuration.rightProbabilityWhenReversed, 'Right probability');
  return { ...configuration };
}

function nextRandom(provider: RandomProvider): number {
  const value = provider.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new ValidationRepositoryError('Random provider must return values in [0, 1).', 'draw');
  }
  return value;
}

export class DefaultDrawEngine implements DrawEngine {
  draw(
    deck: readonly TarotCard[],
    configuration: DrawConfiguration,
    randomProvider: RandomProvider = new MathRandomProvider(),
    timeProvider: TimeProvider = new SystemTimeProvider(),
  ): DrawResult {
    if (deck.length === 0) {
      throw new ValidationRepositoryError('The tarot deck is empty.', 'draw');
    }
    const values = validateDrawConfiguration(configuration, deck.length);
    const available = [...deck];
    const cards = Array.from({ length: values.cardCount }, (_, positionIndex) => {
      const selectedIndex = Math.floor(nextRandom(randomProvider) * available.length);
      const selected = available.splice(selectedIndex, 1)[0]!;
      let orientation: 'upright' | 'reversed' = 'upright';
      let reversalVariant: 'left' | 'right' | null = null;

      if (
        values.reversalMode !== 'disabled' &&
        nextRandom(randomProvider) < values.reversedProbability
      ) {
        orientation = 'reversed';
        if (values.reversalMode === 'dual') {
          reversalVariant =
            nextRandom(randomProvider) < values.rightProbabilityWhenReversed ? 'right' : 'left';
        }
      }

      return {
        id: `drawn-${positionIndex + 1}`,
        tarotCardId: selected.id,
        positionIndex,
        spreadPositionId: values.spreadPositionIds[positionIndex]!,
        orientation,
        reversalVariant,
        source: 'drawn' as const,
      };
    });

    return {
      cards,
      configuration: values,
      createdAt: timeProvider.now(),
    };
  }
}

export const drawEngine = new DefaultDrawEngine();
