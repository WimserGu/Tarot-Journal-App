import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { DEMO_USER_ID } from '../../../domain/mockData';
import {
  ForbiddenRepositoryError,
  NetworkRepositoryError,
  NotFoundRepositoryError,
  UnauthorizedRepositoryError,
} from '../../../repositories/repositoryErrors';
import { buildReadingDetail, type ReadingRepository } from '../../readings/readingRepository';
import { journalSeedData } from '../../../repositories/mockJournalStore';
import { SupabaseFollowUpRepository } from '../supabaseFollowUpRepository';

const now = '2026-07-13T10:00:00.000Z';
type State = { rows: Record<string, unknown>[] };

function readingRepository(allowed: boolean): ReadingRepository {
  return {
    getReadingDetail: vi.fn(async (id) =>
      allowed ? buildReadingDetail(journalSeedData, DEMO_USER_ID, id) : null,
    ),
    subscribe: () => () => undefined,
  } as unknown as ReadingRepository;
}

function fakeClient(
  state: State,
  options: { userId?: string | null; error?: { code?: string; message?: string } } = {},
): SupabaseClient {
  const userId = options.userId === undefined ? 'user-a' : options.userId;
  const make = (operation: string, payload?: Record<string, unknown>) => {
    let filters: [string, unknown][] = [];
    const matching = () =>
      state.rows.filter(
        (row) => row.user_id === userId && filters.every(([key, value]) => row[key] === value),
      );
    const result = () => {
      if (options.error) return { data: null, error: options.error };
      if (operation === 'insert' && payload) {
        if (
          state.rows.some(
            (row) =>
              row.user_id === userId &&
              row.reading_id === payload.reading_id &&
              row.scheduled_for === payload.scheduled_for &&
              row.status === 'scheduled',
          )
        )
          return { data: null, error: { code: '23505', message: 'duplicate' } };
        const row = {
          ...payload,
          id: `follow-up-${state.rows.length + 1}`,
          user_id: userId,
          created_at: now,
          updated_at: now,
        };
        state.rows.push(row);
        return { data: row, error: null };
      }
      if (operation === 'update' && payload) {
        state.rows = state.rows.map((row) =>
          row.user_id === userId && filters.every(([key, value]) => row[key] === value)
            ? { ...row, ...payload, updated_at: now }
            : row,
        );
        return { data: matching()[0] ?? null, error: null };
      }
      if (operation === 'delete') {
        state.rows = state.rows.filter(
          (row) => !(row.user_id === userId && filters.every(([key, value]) => row[key] === value)),
        );
        return { data: null, error: null };
      }
      return { data: matching(), error: null };
    };
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return query;
      },
      order: () => query,
      single: async () => result(),
      maybeSingle: async () => {
        const value = result();
        return { ...value, data: Array.isArray(value.data) ? (value.data[0] ?? null) : value.data };
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  };
  return {
    auth: {
      getUser: vi.fn(async () =>
        userId
          ? { data: { user: { id: userId } }, error: null }
          : { data: { user: null }, error: { message: 'missing session' } },
      ),
    },
    from: vi.fn(() => ({
      select: () => make('select'),
      insert: (payload: Record<string, unknown>) => make('insert', payload),
      update: (payload: Record<string, unknown>) => make('update', payload),
      delete: () => make('delete'),
    })),
  } as unknown as SupabaseClient;
}

describe('mocked Supabase FollowUpRepository', () => {
  it('matches create/list/get/update/complete/snooze/delete contract and listeners', async () => {
    const state: State = { rows: [] };
    const repository = new SupabaseFollowUpRepository(
      fakeClient(state),
      readingRepository(true),
      () => now,
      () => 'UTC',
    );
    const listener = vi.fn();
    repository.subscribe(listener);
    const readingId = journalSeedData.readings[0]!.id;
    const created = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    expect(await repository.listForReading(readingId)).toHaveLength(1);
    expect((await repository.getFollowUp(created.id))?.followUp.id).toBe(created.id);
    await repository.snoozeFollowUp(created.id, '2026-07-21T10:00:00.000Z');
    const completed = await repository.completeFollowUp(created.id, {
      outcome: 'happened',
      reflection: 'kept\nlines',
      reviewedAt: now,
    });
    expect(completed.reflection).toBe('kept\nlines');
    expect(await repository.listFollowUps({ status: 'completed' })).toHaveLength(1);
    await repository.deleteFollowUp(created.id);
    expect(await repository.getFollowUp(created.id)).toBeNull();
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
  it('maps missing session, RLS and network errors', async () => {
    await expect(
      new SupabaseFollowUpRepository(
        fakeClient({ rows: [] }, { userId: null }),
        readingRepository(true),
      ).listFollowUps(),
    ).rejects.toBeInstanceOf(UnauthorizedRepositoryError);
    await expect(
      new SupabaseFollowUpRepository(
        fakeClient({ rows: [] }, { error: { code: '42501', message: 'row-level security' } }),
        readingRepository(true),
      ).listFollowUps(),
    ).rejects.toBeInstanceOf(ForbiddenRepositoryError);
    await expect(
      new SupabaseFollowUpRepository(
        fakeClient({ rows: [] }, { error: { message: 'Failed to fetch' } }),
        readingRepository(true),
      ).listFollowUps(),
    ).rejects.toBeInstanceOf(NetworkRepositoryError);
  });
  it('simulates user A/B row isolation and blocks linking B to A Reading', async () => {
    const state: State = { rows: [] };
    const readingId = journalSeedData.readings[0]!.id;
    const userA = new SupabaseFollowUpRepository(
      fakeClient(state, { userId: 'user-a' }),
      readingRepository(true),
      () => now,
      () => 'UTC',
    );
    const created = await userA.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    const userB = new SupabaseFollowUpRepository(
      fakeClient(state, { userId: 'user-b' }),
      readingRepository(false),
      () => now,
      () => 'UTC',
    );
    expect(await userB.getFollowUp(created.id)).toBeNull();
    await expect(
      userB.createFollowUp({ readingId, scheduledFor: '2026-07-21T10:00:00.000Z' }),
    ).rejects.toBeInstanceOf(NotFoundRepositoryError);
  });
});
