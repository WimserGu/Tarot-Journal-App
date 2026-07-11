import { describe, expect, it, vi } from 'vitest';

import { createSupabaseClient, getSupabaseClient } from '../supabase';

vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ source: 'mock-supabase-client' })),
}));

describe('Supabase client', () => {
  it('creates a client from a validated explicit configuration without network access', () => {
    const client = createSupabaseClient({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
    });

    expect(client).toBeDefined();
  });

  it('creates a client only when the Supabase adapter is enabled', () => {
    const client = getSupabaseClient({
      EXPO_PUBLIC_DATA_ADAPTER: 'supabase',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    });

    expect(client).toBeDefined();
  });
});
