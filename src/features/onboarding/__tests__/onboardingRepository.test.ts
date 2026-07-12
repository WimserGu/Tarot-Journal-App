import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOCAL_ONBOARDING_KEY,
  LocalOnboardingRepository,
  SupabaseOnboardingRepository,
} from '../onboardingRepository';
const storage = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => storage.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      storage.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      storage.delete(k);
    }),
  },
}));
vi.mock('../../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }));
describe('LocalOnboardingRepository', () => {
  beforeEach(() => storage.clear());
  it('persists completion and reset independently from journal data', async () => {
    const repo = new LocalOnboardingRepository();
    expect((await repo.getStatus()).completed).toBe(false);
    await repo.markCompleted();
    expect(storage.has(LOCAL_ONBOARDING_KEY)).toBe(true);
    expect((await repo.getStatus()).completed).toBe(true);
    await repo.reset();
    expect((await repo.getStatus()).completed).toBe(false);
  });
});
describe('SupabaseOnboardingRepository (mocked)', () => {
  function fake(row: { onboarding_completed_at: string | null } | null) {
    const maybeSingle = vi.fn(async () => ({ data: row, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const upsert = vi.fn(async () => ({ error: null }));
    const client = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user' } }, error: null })) },
      from: vi.fn(() => ({ select, upsert })),
    } as unknown as SupabaseClient;
    return { client, upsert };
  }
  it('treats a missing row as incomplete, not NotFound', async () => {
    const { client } = fake(null);
    expect(await new SupabaseOnboardingRepository(client).getStatus()).toEqual({
      completedAt: null,
      completed: false,
    });
  });
  it('uses an owned atomic upsert for completion and reset', async () => {
    const { client, upsert } = fake(null);
    const repo = new SupabaseOnboardingRepository(client);
    await repo.markCompleted();
    await repo.reset();
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenLastCalledWith(
      { user_id: 'user', onboarding_completed_at: null },
      { onConflict: 'user_id' },
    );
  });
});
