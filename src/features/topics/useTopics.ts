import { useCallback, useEffect, useState } from 'react';

import type { UUID } from '@/domain/types';

import { topicRepository } from '@/repositories/repositoryFactory';
import type { TopicDetail, TopicListItem, TopicRepository } from './topicRepository';

type ResourceState<T> = {
  data: T;
  is_loading: boolean;
  error_message: string | null;
};

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

export function useTopicList(repository: TopicRepository = topicRepository) {
  const [state, setState] = useState<ResourceState<TopicListItem[]>>({
    data: [],
    is_loading: true,
    error_message: null,
  });

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, is_loading: true, error_message: null }));

    try {
      const topics = await repository.listTopics();
      setState({ data: topics, is_loading: false, error_message: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        is_loading: false,
        error_message: messageFromError(error, '暂时无法加载长期议题。'),
      }));
    }
  }, [repository]);

  useEffect(() => {
    void reload();

    return repository.subscribe(() => {
      void reload();
    });
  }, [repository, reload]);

  return { ...state, reload };
}

export function useTopicDetail(
  topicId: UUID | undefined,
  repository: TopicRepository = topicRepository,
) {
  const [state, setState] = useState<ResourceState<TopicDetail | null>>({
    data: null,
    is_loading: true,
    error_message: null,
  });

  const reload = useCallback(async () => {
    if (!topicId) {
      setState({ data: null, is_loading: false, error_message: '缺少议题标识。' });
      return;
    }

    setState((current) => ({ ...current, is_loading: true, error_message: null }));

    try {
      const topicDetail = await repository.getTopicDetail(topicId);
      setState({ data: topicDetail, is_loading: false, error_message: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        is_loading: false,
        error_message: messageFromError(error, '暂时无法加载这个长期议题。'),
      }));
    }
  }, [repository, topicId]);

  useEffect(() => {
    void reload();

    return repository.subscribe(() => {
      void reload();
    });
  }, [repository, reload]);

  return { ...state, reload };
}
