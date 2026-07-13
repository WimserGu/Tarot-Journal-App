import { getAppEnvironment, type EnvironmentSource } from '../config/environment';
import { questionTemplateRepository as localQuestionTemplates } from '../features/questions/mockQuestionTemplateRepository';
import type { QuestionTemplateRepository } from '../features/questions/questionTemplateRepository';
import { readingRepository as localReadings } from '../features/readings/mockReadingRepository';
import type { ReadingRepository } from '../features/readings/readingRepository';
import { topicRepository as localTopics } from '../features/topics/mockTopicRepository';
import type { TopicRepository } from '../features/topics/topicRepository';
import { localReviewRepository } from '../features/reviews/reviewRepository';
import type { ReviewRepository } from '../features/reviews/reviewRepository';
import { SupabaseReviewRepository } from '../features/reviews/supabaseReviewRepository';
import {
  localFollowUpRepository,
  type FollowUpRepository,
} from '../features/followups/followUpRepository';
import { SupabaseFollowUpRepository } from '../features/followups/supabaseFollowUpRepository';
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
  reviews: ReviewRepository;
  followUps: FollowUpRepository;
};
const local: AppRepositories = {
  topics: localTopics,
  questionTemplates: localQuestionTemplates,
  readings: localReadings,
  reviews: localReviewRepository,
  followUps: localFollowUpRepository,
};
let overrides: Partial<AppRepositories> = {};
let cachedSupabase: AppRepositories | null = null;

export function createRepositories(source?: EnvironmentSource): AppRepositories {
  const environment = getAppEnvironment(source);
  if (environment.dataAdapter === 'local') return { ...local, ...overrides };
  if (!cachedSupabase) {
    const client = getSupabaseClient(source);
    const readings = new SupabaseReadingRepository(client);
    cachedSupabase = {
      topics: new SupabaseTopicRepository(client),
      questionTemplates: new SupabaseQuestionTemplateRepository(client),
      readings,
      reviews: new SupabaseReviewRepository(client),
      followUps: new SupabaseFollowUpRepository(client, readings),
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
export const reviewRepository: ReviewRepository = new Proxy({} as ReviewRepository, {
  get: (_target, key) =>
    Reflect.get(createRepositories().reviews, key).bind(createRepositories().reviews),
});
export const followUpRepository: FollowUpRepository = new Proxy({} as FollowUpRepository, {
  get: (_target, key) =>
    Reflect.get(createRepositories().followUps, key).bind(createRepositories().followUps),
});
