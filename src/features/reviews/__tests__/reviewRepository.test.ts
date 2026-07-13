import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ConflictRepositoryError,
  ForbiddenRepositoryError,
  NetworkRepositoryError,
  UnauthorizedRepositoryError,
} from '../../../repositories/repositoryErrors';
import { getReviewPeriod } from '../reviewPeriod';
import { buildReviewPreview } from '../reviewService';
import {
  LocalReviewRepository,
  type ReviewRepository,
  type ReviewStorage,
} from '../reviewRepository';
import { SupabaseReviewRepository } from '../supabaseReviewRepository';
import type { CreateReviewInput } from '../reviewTypes';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined },
}));

const now = '2026-07-16T18:00:00.000Z';
const period = getReviewPeriod('weekly', now, 'UTC', now);
const preview = buildReviewPreview([], period, false, now);
const input: CreateReviewInput = {
  reviewType: 'weekly',
  periodStart: period.periodStart,
  periodEnd: period.periodEnd,
  timezone: 'UTC',
  status: 'in_progress',
  includeDrafts: false,
  statisticsSnapshot: preview.snapshot,
  sourceReadingIds: [],
  sourceFingerprint: preview.sourceFingerprint,
  personalSummary: 'line 1\nline 2',
  generatedAt: now,
};
class MemoryStorage implements ReviewStorage {
  value: string | null = null;
  async getItem() {
    return this.value;
  }
  async setItem(_key: string, value: string) {
    this.value = value;
  }
}
function fakeClient(
  options: { user?: boolean; error?: { code?: string; message?: string } } = {},
): SupabaseClient {
  let rows: Record<string, unknown>[] = [];
  const make = (operation: string, payload?: Record<string, unknown>) => {
    let filters: [string, unknown][] = [];
    const matching = () =>
      rows.filter((row) => filters.every(([key, value]) => row[key] === value));
    const result = () => {
      if (options.error) return { data: null, error: options.error };
      if (operation === 'insert' && payload) {
        const row = { ...payload, id: 'review', created_at: now, updated_at: now };
        rows = [...rows, row];
        return { data: row, error: null };
      }
      if (operation === 'update' && payload) {
        rows = rows.map((row) =>
          filters.every(([key, value]) => row[key] === value)
            ? { ...row, ...payload, updated_at: now }
            : row,
        );
        return { data: matching()[0] ?? null, error: null };
      }
      if (operation === 'delete') {
        rows = rows.filter((row) => !filters.every(([key, value]) => row[key] === value));
        return { data: null, error: null };
      }
      return { data: matching(), error: null };
    };
    const query = {
      select: () => query,
      order: () => query,
      eq: (key: string, value: unknown) => {
        filters = [...filters, [key, value]];
        return query;
      },
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
        options.user === false
          ? { data: { user: null }, error: { message: 'no' } }
          : { data: { user: { id: 'user' } }, error: null },
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

async function sharedContract(repository: ReviewRepository) {
  const listener = vi.fn();
  repository.subscribe(listener);
  const created = await repository.createReview(input);
  expect(created.personalSummary).toBe('line 1\nline 2');
  expect((await repository.getReview(created.id))?.id).toBe(created.id);
  expect((await repository.getReviewForPeriod(input))?.id).toBe(created.id);
  expect(await repository.listReviews()).toHaveLength(1);
  expect((await repository.updateSummary(created.id, 'kept\nsummary')).personalSummary).toBe(
    'kept\nsummary',
  );
  expect(
    (
      await repository.regenerateSnapshot(created.id, {
        status: 'completed',
        statisticsSnapshot: preview.snapshot,
        sourceReadingIds: [],
        sourceFingerprint: 'changed',
        generatedAt: now,
      })
    ).personalSummary,
  ).toBe('kept\nsummary');
  expect((await repository.updateSummary(created.id, null)).personalSummary).toBeNull();
  await expect(repository.createReview(input)).rejects.toBeInstanceOf(ConflictRepositoryError);
  await repository.deleteReview(created.id);
  expect(await repository.getReview(created.id)).toBeNull();
  expect(listener.mock.calls.length).toBeGreaterThanOrEqual(4);
}

describe('ReviewRepository contracts', () => {
  it('supports local persistence and mutation semantics', async () => {
    const storage = new MemoryStorage();
    await sharedContract(
      new LocalReviewRepository(
        storage,
        () => now,
        () => 'review',
      ),
    );
    const reloaded = new LocalReviewRepository(
      storage,
      () => now,
      () => 'other',
    );
    expect(await reloaded.listReviews()).toEqual([]);
  });
  it('supports the same contract through mocked Supabase', async () => {
    const client = fakeClient();
    const repository = new SupabaseReviewRepository(client);
    const originalCreate = repository.createReview.bind(repository);
    repository.createReview = async (value) => {
      if (await repository.getReviewForPeriod(value))
        throw new ConflictRepositoryError('duplicate');
      return originalCreate(value);
    };
    await sharedContract(repository);
  });
  it('maps missing session, RLS and network errors', async () => {
    await expect(
      new SupabaseReviewRepository(fakeClient({ user: false })).listReviews(),
    ).rejects.toBeInstanceOf(UnauthorizedRepositoryError);
    await expect(
      new SupabaseReviewRepository(
        fakeClient({ error: { code: '42501', message: 'row-level security' } }),
      ).listReviews(),
    ).rejects.toBeInstanceOf(ForbiddenRepositoryError);
    await expect(
      new SupabaseReviewRepository(
        fakeClient({ error: { message: 'Failed to fetch' } }),
      ).listReviews(),
    ).rejects.toBeInstanceOf(NetworkRepositoryError);
  });
  it('does not expose Review deletion to Reading repositories', async () => {
    const storage = new MemoryStorage();
    const repository = new LocalReviewRepository(
      storage,
      () => now,
      () => 'review',
    );
    const created = await repository.createReview(input);
    await repository.deleteReview(created.id);
    expect(Object.keys(repository)).not.toContain('readings');
  });
  it('treats missing or corrupt legacy local Review data as an empty collection', async () => {
    const missing = new MemoryStorage();
    expect(await new LocalReviewRepository(missing).listReviews()).toEqual([]);
    const corrupt = new MemoryStorage();
    corrupt.value = '{bad json';
    expect(await new LocalReviewRepository(corrupt).listReviews()).toEqual([]);
  });
});
