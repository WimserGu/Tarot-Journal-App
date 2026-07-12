import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentConfigurationError } from '../../config/environment';
import {
  createRepositories,
  resetRepositoryOverrides,
  setRepositoryOverrides,
} from '../repositoryFactory';

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn(() => ({})) }));
vi.mock('../supabaseRepositories', () => ({
  SupabaseTopicRepository: vi.fn(),
  SupabaseQuestionTemplateRepository: vi.fn(),
  SupabaseReadingRepository: vi.fn(),
}));

describe('repository factory', () => {
  afterEach(resetRepositoryOverrides);
  it('defaults to local and supports isolated overrides', () => {
    const replacement = { listTopics: async () => [], subscribe: () => () => undefined };
    setRepositoryOverrides({
      topics: replacement as unknown as ReturnType<typeof createRepositories>['topics'],
    });
    expect(createRepositories({}).topics).toBe(replacement);
    resetRepositoryOverrides();
    expect(createRepositories({}).topics).not.toBe(replacement);
  });
  it('fails clearly when Supabase configuration is absent', () => {
    expect(() => createRepositories({ EXPO_PUBLIC_DATA_ADAPTER: 'supabase' })).toThrow(
      EnvironmentConfigurationError,
    );
  });
});
