import { getAppEnvironment, type EnvironmentSource } from '../config/environment';
import { questionTemplateRepository as localQuestionTemplates } from '../features/questions/mockQuestionTemplateRepository';
import type { QuestionTemplateRepository } from '../features/questions/questionTemplateRepository';
import { readingRepository as localReadings } from '../features/readings/mockReadingRepository';
import type { ReadingRepository } from '../features/readings/readingRepository';
import { topicRepository as localTopics } from '../features/topics/mockTopicRepository';
import type { TopicRepository } from '../features/topics/topicRepository';
import { getSupabaseClient } from '../lib/supabase';
import {
  SupabaseQuestionTemplateRepository,
  SupabaseReadingRepository,
  SupabaseTopicRepository,
} from './supabaseRepositories';

export type AppRepositories = {
  topics: TopicRepository;
  questionTemplates: QuestionTemplateRepository;
  readings: ReadingRepository;
};
const local: AppRepositories = {
  topics: localTopics,
  questionTemplates: localQuestionTemplates,
  readings: localReadings,
};
let overrides: Partial<AppRepositories> = {};
let cachedSupabase: AppRepositories | null = null;

export function createRepositories(source?: EnvironmentSource): AppRepositories {
  const environment = getAppEnvironment(source);
  if (environment.dataAdapter === 'local') return { ...local, ...overrides };
  if (!cachedSupabase) {
    const client = getSupabaseClient(source);
    cachedSupabase = {
      topics: new SupabaseTopicRepository(client),
      questionTemplates: new SupabaseQuestionTemplateRepository(client),
      readings: new SupabaseReadingRepository(client),
    };
  }
  return { ...cachedSupabase, ...overrides };
}

export function setRepositoryOverrides(values: Partial<AppRepositories>): void {
  overrides = values;
}
export function resetRepositoryOverrides(): void {
  overrides = {};
  cachedSupabase = null;
}

// Stable lazy proxies keep local startup independent from Supabase configuration.
export const topicRepository: TopicRepository = new Proxy({} as TopicRepository, {
  get: (_target, key) =>
    Reflect.get(createRepositories().topics, key).bind(createRepositories().topics),
});
export const questionTemplateRepository: QuestionTemplateRepository = new Proxy(
  {} as QuestionTemplateRepository,
  {
    get: (_target, key) =>
      Reflect.get(createRepositories().questionTemplates, key).bind(
        createRepositories().questionTemplates,
      ),
  },
);
export const readingRepository: ReadingRepository = new Proxy({} as ReadingRepository, {
  get: (_target, key) =>
    Reflect.get(createRepositories().readings, key).bind(createRepositories().readings),
});
