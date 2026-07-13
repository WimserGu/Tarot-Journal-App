import type { DrawnCard, DrawSession } from './drawTypes';
import {
  DrawSessionNotFoundError,
  type CreateDrawSessionInput,
  type DrawSessionRepository,
  type UpdateDrawSessionInput,
} from './drawSessionRepository';
import { JournalStore, mockJournalStore } from '../../repositories/mockJournalStore';
import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import type { Reading, UUID } from '../../domain/types';
import { spreadRepository } from '../spreads/spreadRepository';

function cloneCards(cards: readonly DrawnCard[]): DrawnCard[] {
  return cards.map((card) => ({ ...card }));
}

function validateCards(cards: readonly DrawnCard[]): void {
  if (cards.length === 0)
    throw new ValidationRepositoryError('A draw session needs at least one card.');
  const positions = new Set(cards.map((card) => card.positionIndex));
  if (positions.size !== cards.length || [...positions].some((position) => position < 0)) {
    throw new ValidationRepositoryError('Draw card positions must be unique and non-negative.');
  }
  if (
    cards.some(
      (card) =>
        (card.source !== 'drawn' && card.source !== 'manual') || card.drawSessionId === null,
    )
  ) {
    throw new ValidationRepositoryError('Draw session cards must preserve their provenance.');
  }
}

export class MockDrawSessionRepository implements DrawSessionRepository {
  constructor(private readonly store: JournalStore) {}

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async create(input: CreateDrawSessionInput): Promise<DrawSession> {
    await this.store.ready();
    const active = await this.getActiveDraft();
    if (active) throw new ValidationRepositoryError('Only one active draw draft is allowed.');
    const now = this.store.now();
    const id = this.store.createId('draw-session');
    const spread = spreadRepository.resolveSpread(
      input.spreadId ?? input.configuration.spreadId,
      input.configuration.spreadId === 'open' ? input.cards.length : undefined,
    );
    const cards = input.cards.map((card, index) => ({
      ...card,
      drawSessionId: id,
      positionSnapshot:
        card.positionSnapshot ?? spread.positions[index]?.title ?? `Card ${index + 1}`,
    }));
    validateCards(cards);
    const session: DrawSession = {
      id,
      userId: this.store.userId,
      createdAt: now,
      updatedAt: now,
      spreadId: input.spreadId,
      configuration: {
        ...input.configuration,
        spreadPositionIds: [...input.configuration.spreadPositionIds],
      },
      status: 'draft',
      linkedReadingId: null,
      cards,
    };
    await this.store.mutate((data) => data.draw_sessions.push(session));
    return session;
  }

  async update(id: UUID, input: UpdateDrawSessionInput): Promise<DrawSession> {
    await this.store.ready();
    const current = await this.get(id);
    if (!current) throw new DrawSessionNotFoundError();
    if (current.status === 'discarded') {
      throw new ValidationRepositoryError('Discarded draw sessions cannot be reopened.');
    }
    if (current.status === 'saved') {
      throw new ValidationRepositoryError('Saved draw sessions are immutable.');
    }
    const cards = input.cards.map((card) => ({ ...card, drawSessionId: current.id }));
    validateCards(cards);
    const status = input.status ?? current.status;
    if (status === 'saved' && !input.linkedReadingId) {
      throw new ValidationRepositoryError('A saved draw session requires its Reading link.');
    }
    const updated: DrawSession = {
      ...current,
      cards,
      configuration: {
        ...input.configuration,
        spreadPositionIds: [...input.configuration.spreadPositionIds],
      },
      spreadId: input.spreadId,
      status,
      linkedReadingId: input.linkedReadingId ?? current.linkedReadingId,
      updatedAt: this.store.now(),
    };
    await this.store.mutate((data) => {
      const index = data.draw_sessions.findIndex((session) => session.id === id);
      data.draw_sessions[index] = updated;
    });
    return updated;
  }

  async get(id: UUID): Promise<DrawSession | null> {
    await this.store.ready();
    const session = this.store
      .snapshot()
      .draw_sessions?.find(
        (candidate) => candidate.id === id && candidate.userId === this.store.userId,
      );
    return session ? { ...session, cards: cloneCards(session.cards) } : null;
  }

  async list(): Promise<DrawSession[]> {
    await this.store.ready();
    const sessions = this.store.snapshot().draw_sessions ?? [];
    return sessions
      .filter((session) => session.userId === this.store.userId && session.status !== 'discarded')
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
      .map((session) => ({ ...session, cards: cloneCards(session.cards) }));
  }

  async getActiveDraft(): Promise<DrawSession | null> {
    await this.store.ready();
    const drafts = (this.store.snapshot().draw_sessions ?? []).filter(
      (session) => session.userId === this.store.userId && session.status === 'draft',
    );
    if (drafts.length > 1)
      throw new ValidationRepositoryError('Only one active draw draft is allowed.');
    const session = drafts[0];
    return session ? { ...session, cards: cloneCards(session.cards) } : null;
  }

  async listRelatedReadings(id: UUID): Promise<Reading[]> {
    await this.store.ready();
    const data = this.store.snapshot();
    const readingIds = new Set(
      data.reading_cards
        .filter(
          (card) =>
            card.user_id === this.store.userId &&
            card.source === 'drawn' &&
            card.drawSessionId === id,
        )
        .map((card) => card.reading_id),
    );
    return data.readings
      .filter((reading) => reading.user_id === this.store.userId && readingIds.has(reading.id))
      .sort((first, second) => second.reading_at.localeCompare(first.reading_at));
  }

  async delete(id: UUID): Promise<void> {
    await this.store.ready();
    const session = await this.get(id);
    if (!session) throw new DrawSessionNotFoundError();
    await this.store.mutate((data) => {
      data.draw_sessions = data.draw_sessions.filter((candidate) => candidate.id !== id);
    });
  }
}

export const drawSessionRepository = new MockDrawSessionRepository(mockJournalStore);
