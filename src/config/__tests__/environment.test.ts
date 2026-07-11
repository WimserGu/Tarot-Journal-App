import { describe, expect, it } from 'vitest';

import {
  EnvironmentConfigurationError,
  getAppEnvironment,
  getSupabaseEnvironment,
} from '../environment';

describe('getAppEnvironment', () => {
  it('uses local persistence by default without requiring Supabase variables', () => {
    expect(getAppEnvironment({})).toEqual({ dataAdapter: 'local', supabase: null });
  });

  it('validates a Supabase adapter configuration', () => {
    expect(
      getAppEnvironment({
        EXPO_PUBLIC_DATA_ADAPTER: 'supabase',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co/',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      }),
    ).toEqual({
      dataAdapter: 'supabase',
      supabase: { url: 'https://example.supabase.co', publishableKey: 'publishable-key' },
    });
  });

  it('rejects invalid adapter values and incomplete Supabase configuration', () => {
    expect(() => getAppEnvironment({ EXPO_PUBLIC_DATA_ADAPTER: 'remote' })).toThrow(
      EnvironmentConfigurationError,
    );
    expect(() => getAppEnvironment({ EXPO_PUBLIC_DATA_ADAPTER: 'supabase' })).toThrow(
      EnvironmentConfigurationError,
    );
    expect(() =>
      getAppEnvironment({
        EXPO_PUBLIC_DATA_ADAPTER: 'supabase',
        EXPO_PUBLIC_SUPABASE_URL: 'http://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      }),
    ).toThrow(EnvironmentConfigurationError);
  });

  it('does not create Supabase configuration while local adapter is active', () => {
    expect(() => getSupabaseEnvironment({ EXPO_PUBLIC_DATA_ADAPTER: 'local' })).toThrow(
      EnvironmentConfigurationError,
    );
  });
});
