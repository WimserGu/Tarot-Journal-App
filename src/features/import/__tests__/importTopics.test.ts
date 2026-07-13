import { describe, expect, it, vi } from 'vitest';
import { createOrReuseImportTopic, findExactImportTopic } from '../importTopics';
import type { TopicRepository } from '../../topics/topicRepository';

const repositoryFor = (createTopic: ReturnType<typeof vi.fn>) =>
  ({ createTopic }) as unknown as TopicRepository;

describe('Import Assistant topics', () => {
  const existingTopics = [{ id: 'topic-relationship', title: '关系' }];

  it('preselects only an exact matching Topic title', () => {
    expect(findExactImportTopic('关系', existingTopics)).toEqual(existingTopics[0]);
    expect(findExactImportTopic('关系议题', existingTopics)).toBeNull();
  });

  it('reuses an exact same-name Topic without creating a duplicate', async () => {
    const createTopic = vi.fn();
    const topic = await createOrReuseImportTopic(
      '关系',
      existingTopics,
      repositoryFor(createTopic),
    );

    expect(topic).toEqual(existingTopics[0]);
    expect(createTopic).not.toHaveBeenCalled();
  });

  it('creates and returns a new Topic only after explicit confirmation', async () => {
    const createTopic = vi.fn().mockResolvedValue({ id: 'topic-new', title: '事业' });

    const topic = await createOrReuseImportTopic(
      '事业',
      existingTopics,
      repositoryFor(createTopic),
    );

    expect(createTopic).toHaveBeenCalledWith({
      name: '事业',
      description: '',
      icon: 'sparkles',
      isPinned: false,
    });
    expect(topic).toEqual({ id: 'topic-new', title: '事业' });
  });

  it('propagates creation errors so the screen keeps its existing draft state', async () => {
    const error = new Error('Topic creation failed');
    const createTopic = vi.fn().mockRejectedValue(error);

    await expect(
      createOrReuseImportTopic('事业', existingTopics, repositoryFor(createTopic)),
    ).rejects.toBe(error);
  });
});
