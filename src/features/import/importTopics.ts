import type { TopicRepository } from '../topics/topicRepository';

export type ImportTopicChoice = { id: string; title: string };

export function findExactImportTopic(
  title: string | null,
  topics: readonly ImportTopicChoice[],
): ImportTopicChoice | null {
  if (!title) return null;
  return topics.find((topic) => topic.title === title) ?? null;
}

export async function createOrReuseImportTopic(
  title: string,
  topics: readonly ImportTopicChoice[],
  repository: TopicRepository,
): Promise<ImportTopicChoice> {
  const normalizedTitle = title.trim();
  const existing = findExactImportTopic(normalizedTitle, topics);
  if (existing) return existing;

  const created = await repository.createTopic({
    name: normalizedTitle,
    description: '',
    icon: 'sparkles',
    isPinned: false,
  });
  return { id: created.id, title: created.title };
}
