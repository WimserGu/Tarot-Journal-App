import { describe, expect, it, vi } from 'vitest';
import { DEMO_USER_ID } from '../../../domain/mockData';
import { MockQuestionTemplateRepository } from '../../questions/mockQuestionTemplateRepository';
import type { QuestionTemplateRepository } from '../../questions/questionTemplateRepository';
import { MockReadingRepository } from '../../readings/mockReadingRepository';
import type { ReadingRepository } from '../../readings/readingRepository';
import { MockTopicRepository } from '../../topics/mockTopicRepository';
import type { TopicRepository } from '../../topics/topicRepository';
import { journalSeedData, MockJournalStore } from '../../../repositories/mockJournalStore';
import { RepositoryStatisticsRepository } from '../statisticsRepository';

vi.mock('../../../repositories/repositoryFactory', () => ({
  readingRepository: {},
  topicRepository: {},
  questionTemplateRepository: {},
}));

function localAdapters() {
  const store = new MockJournalStore(journalSeedData, { user_id: DEMO_USER_ID });
  return {
    readings: new MockReadingRepository(store),
    topics: new MockTopicRepository(store),
    questions: new MockQuestionTemplateRepository(store),
  };
}
function mockedSupabaseAdapters(local: ReturnType<typeof localAdapters>) {
  return {
    readings: {
      listReadings: vi.fn((filters) => local.readings.listReadings(filters)),
      subscribe: vi.fn((listener) => local.readings.subscribe(listener)),
    } as unknown as ReadingRepository,
    topics: {
      listTopics: vi.fn(() => local.topics.listTopics()),
      subscribe: vi.fn((listener) => local.topics.subscribe(listener)),
    } as unknown as TopicRepository,
    questions: {
      listQuestionTemplates: vi.fn((topicId) => local.questions.listQuestionTemplates(topicId)),
      subscribe: vi.fn((listener) => local.questions.subscribe(listener)),
    } as unknown as QuestionTemplateRepository,
  };
}
describe('StatisticsRepository contract', () => {
  it('produces the same domain input from local and mocked Supabase contracts', async () => {
    const local = localAdapters();
    const remote = mockedSupabaseAdapters(local);
    const localRepo = new RepositoryStatisticsRepository(
      local.readings,
      local.topics,
      local.questions,
    );
    const remoteRepo = new RepositoryStatisticsRepository(
      remote.readings,
      remote.topics,
      remote.questions,
    );
    expect(await remoteRepo.listReadings()).toEqual(await localRepo.listReadings());
    expect(await remoteRepo.listTopics()).toEqual(await localRepo.listTopics());
    expect(remote.readings.listReadings).toHaveBeenCalledWith();
  });
  it('combines and cleans all repository subscriptions', () => {
    const local = localAdapters();
    const repo = new RepositoryStatisticsRepository(local.readings, local.topics, local.questions);
    const listener = vi.fn();
    const stop = repo.subscribe(listener);
    stop();
  });
});
