import type { SupabaseClient } from '@supabase/supabase-js';

import type { Reading, UUID } from '../domain/types';
import type { DrawSession } from '../features/draw/drawTypes';
import {
  DrawSessionNotFoundError,
  type CreateDrawSessionInput,
  type DrawSessionRepository,
  type UpdateDrawSessionInput,
} from '../features/draw/drawSessionRepository';
import {
  ConflictRepositoryError,
  ForbiddenRepositoryError,
  NetworkRepositoryError,
  UnauthorizedRepositoryError,
  UnknownRepositoryError,
  ValidationRepositoryError,
} from './repositoryErrors';
import { mapDrawSessionCardRow, mapDrawSessionRow, mapReadingRow } from './supabaseMappers';

type DbError = { code?: string; message?: string } | null;

function check(error: DbError, operation: string): void {
  if (!error) return;
  if (error.code === '42501') throw new ForbiddenRepositoryError(operation);
  if (error.code === '23505')
    throw new ConflictRepositoryError('Only one active draw draft is allowed.', operation);
  if (error.code === '22023' || error.code === '23514')
    throw new ValidationRepositoryError('The draw session is invalid.', operation);
  if (/fetch|network|timeout/i.test(error.message ?? ''))
    throw new NetworkRepositoryError(operation);
  throw new UnknownRepositoryError(operation);
}

function configurationRow(session: Pick<DrawSession, 'configuration'>) {
  const value = session.configuration;
  return {
    card_count: value.cardCount,
    spread_id: value.spreadId,
    spread_position_ids: [...value.spreadPositionIds],
    reversal_mode: value.reversalMode,
    reversed_probability: value.reversedProbability,
    overexpressed_probability_when_reversed: value.overexpressedProbabilityWhenReversed,
  };
}

export class SupabaseDrawSessionRepository implements DrawSessionRepository {
  private readonly listeners = new Set<() => void>();
  constructor(private readonly client: SupabaseClient) {}
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
  private async userId(): Promise<UUID> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new UnauthorizedRepositoryError('auth.getUser');
    return data.user.id;
  }
  private async cards(id: UUID) {
    const { data, error } = await this.client
      .from('draw_session_cards')
      .select('*')
      .eq('draw_session_id', id)
      .order('position_index');
    check(error, 'getDrawSession.cards');
    return (data ?? []).map((row) => mapDrawSessionCardRow(row as Record<string, unknown>));
  }
  async create(input: CreateDrawSessionInput): Promise<DrawSession> {
    const userId = await this.userId();
    if (input.cards.length === 0)
      throw new ValidationRepositoryError(
        'A draw session needs at least one card.',
        'createDrawSession',
      );
    if (await this.getActiveDraft())
      throw new ValidationRepositoryError(
        'Only one active draw draft is allowed.',
        'createDrawSession',
      );
    const { data, error } = await this.client
      .from('draw_sessions')
      .insert({
        user_id: userId,
        spread_id: input.spreadId,
        configuration: configurationRow(input),
        status: 'draft',
      })
      .select('*')
      .single();
    check(error, 'createDrawSession');
    const session = mapDrawSessionRow(data as Record<string, unknown>);
    const insert = await this.client.from('draw_session_cards').insert(
      input.cards.map((card, index) => ({
        user_id: userId,
        draw_session_id: session.id,
        tarot_card_id: card.tarotCardId,
        position_index: card.positionIndex,
        spread_position_id: card.spreadPositionId,
        position_snapshot: card.positionSnapshot ?? `Card ${index + 1}`,
        orientation: card.orientation,
        reversal_expression: card.reversalExpression,
        source: card.source,
      })),
    );
    check(insert.error, 'createDrawSession.cards');
    this.notify();
    return { ...session, cards: await this.cards(session.id) };
  }
  async update(id: UUID, input: UpdateDrawSessionInput): Promise<DrawSession> {
    const current = await this.get(id);
    if (!current) throw new DrawSessionNotFoundError();
    if (current.status === 'discarded')
      throw new ValidationRepositoryError(
        'Discarded draw sessions cannot be reopened.',
        'updateDrawSession',
      );
    if (current.status === 'saved') {
      throw new ValidationRepositoryError(
        'Saved draw sessions are immutable.',
        'updateDrawSession',
      );
    }
    if (input.cards.length === 0)
      throw new ValidationRepositoryError(
        'A draw session needs at least one card.',
        'updateDrawSession',
      );
    const status = input.status ?? current.status;
    const linkedReadingId = input.linkedReadingId ?? current.linkedReadingId;
    if (status === 'saved' && !linkedReadingId)
      throw new ValidationRepositoryError(
        'A saved draw session requires its Reading link.',
        'updateDrawSession',
      );
    const { data, error } = await this.client
      .from('draw_sessions')
      .update({
        spread_id: input.spreadId,
        configuration: configurationRow(input),
        status,
        linked_reading_id: linkedReadingId,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    check(error, 'updateDrawSession');
    if (!data) throw new DrawSessionNotFoundError();
    const remove = await this.client.from('draw_session_cards').delete().eq('draw_session_id', id);
    check(remove.error, 'updateDrawSession.cards');
    const userId = await this.userId();
    const insert = await this.client.from('draw_session_cards').insert(
      input.cards.map((card, index) => ({
        user_id: userId,
        draw_session_id: id,
        tarot_card_id: card.tarotCardId,
        position_index: card.positionIndex,
        spread_position_id: card.spreadPositionId,
        position_snapshot: card.positionSnapshot ?? `Card ${index + 1}`,
        orientation: card.orientation,
        reversal_expression: card.reversalExpression,
        source: card.source,
      })),
    );
    check(insert.error, 'updateDrawSession.cards');
    this.notify();
    return { ...mapDrawSessionRow(data as Record<string, unknown>), cards: await this.cards(id) };
  }
  async get(id: UUID): Promise<DrawSession | null> {
    await this.userId();
    const { data, error } = await this.client
      .from('draw_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    check(error, 'getDrawSession');
    return data
      ? { ...mapDrawSessionRow(data as Record<string, unknown>), cards: await this.cards(id) }
      : null;
  }
  async list(): Promise<DrawSession[]> {
    await this.userId();
    const { data, error } = await this.client
      .from('draw_sessions')
      .select('*')
      .neq('status', 'discarded')
      .order('created_at', { ascending: false });
    check(error, 'listDrawSessions');
    return Promise.all(
      (data ?? []).map(async (row) => {
        const session = mapDrawSessionRow(row as Record<string, unknown>);
        return { ...session, cards: await this.cards(session.id) };
      }),
    );
  }
  async getActiveDraft(): Promise<DrawSession | null> {
    await this.userId();
    const { data, error } = await this.client
      .from('draw_sessions')
      .select('*')
      .eq('status', 'draft')
      .maybeSingle();
    check(error, 'getActiveDrawDraft');
    if (!data) return null;
    const session = mapDrawSessionRow(data as Record<string, unknown>);
    return { ...session, cards: await this.cards(session.id) };
  }
  async listRelatedReadings(id: UUID): Promise<Reading[]> {
    await this.userId();
    const { data: cards, error: cardsError } = await this.client
      .from('reading_cards')
      .select('reading_id')
      .eq('draw_session_id', id)
      .eq('source', 'drawn');
    check(cardsError, 'listRelatedReadings.cards');
    const ids = [...new Set((cards ?? []).map((card) => String(card.reading_id)))];
    if (ids.length === 0) return [];
    const { data, error } = await this.client
      .from('readings')
      .select('*')
      .in('id', ids)
      .order('reading_at', { ascending: false });
    check(error, 'listRelatedReadings');
    return (data ?? []).map((row) => mapReadingRow(row as Record<string, unknown>));
  }
  async delete(id: UUID): Promise<void> {
    await this.userId();
    const { error } = await this.client.from('draw_sessions').delete().eq('id', id);
    check(error, 'deleteDrawSession');
    this.notify();
  }
}
