import { useCallback, useEffect, useState } from 'react';

import type { UUID } from '@/domain/types';

import { readingRepository } from '@/repositories/repositoryFactory';
import type {
  QuestionHistory,
  QuestionHistoryQuery,
  ReadingDetail,
  ReadingFormContext,
  ReadingRepository,
  ReadingTimelineItem,
  TopicTimelineFilters,
} from './readingRepository';

type ResourceState<T> = {
  data: T;
  is_loading: boolean;
  error_message: string | null;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

export function useReadingFormContext(repository: ReadingRepository = readingRepository) {
  const [state, setState] = useState<ResourceState<ReadingFormContext | null>>({
    data: null,
    is_loading: true,
    error_message: null,
  });

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, is_loading: true, error_message: null }));

    try {
      const context = await repository.getReadingFormContext();
      setState({ data: context, is_loading: false, error_message: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        is_loading: false,
        error_message: errorMessage(error, '暂时无法加载记录表单。'),
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

export function useReadingDetail(
  readingId: UUID | undefined,
  repository: ReadingRepository = readingRepository,
) {
  const [state, setState] = useState<ResourceState<ReadingDetail | null>>({
    data: null,
    is_loading: true,
    error_message: null,
  });

  const reload = useCallback(async () => {
    if (!readingId) {
      setState({ data: null, is_loading: false, error_message: '缺少记录标识。' });
      return;
    }

    setState((current) => ({ ...current, is_loading: true, error_message: null }));

    try {
      const detail = await repository.getReadingDetail(readingId);
      setState({ data: detail, is_loading: false, error_message: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        is_loading: false,
        error_message: errorMessage(error, '暂时无法加载这条记录。'),
      }));
    }
  }, [readingId, repository]);

  useEffect(() => {
    void reload();

    return repository.subscribe(() => {
      void reload();
    });
  }, [repository, reload]);

  return { ...state, reload };
}

export function useTopicTimeline(
  filters: TopicTimelineFilters | null,
  repository: ReadingRepository = readingRepository,
) {
  const [state, setState] = useState<ResourceState<ReadingTimelineItem[]>>({
    data: [],
    is_loading: true,
    error_message: null,
  });

  const reload = useCallback(async () => {
    if (!filters) {
      setState({ data: [], is_loading: false, error_message: '缺少议题标识。' });
      return;
    }

    setState((current) => ({ ...current, is_loading: true, error_message: null }));

    try {
      const timeline = await repository.getTopicTimeline(filters);
      setState({ data: timeline, is_loading: false, error_message: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        is_loading: false,
        error_message: errorMessage(error, '暂时无法加载时间线。'),
      }));
    }
  }, [filters, repository]);

  useEffect(() => {
    void reload();

    return repository.subscribe(() => {
      void reload();
    });
  }, [repository, reload]);

  return { ...state, reload };
}

export function useQuestionHistory(
  query: QuestionHistoryQuery | null,
  repository: ReadingRepository = readingRepository,
) {
  const [state, setState] = useState<ResourceState<QuestionHistory | null>>({
    data: null,
    is_loading: true,
    error_message: null,
  });

  const reload = useCallback(async () => {
    if (!query) {
      setState({ data: null, is_loading: false, error_message: '缺少固定问题标识。' });
      return;
    }

    setState((current) => ({ ...current, is_loading: true, error_message: null }));

    try {
      const history = await repository.getQuestionHistory(query);
      setState({ data: history, is_loading: false, error_message: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        is_loading: false,
        error_message: errorMessage(error, '暂时无法加载同题历史。'),
      }));
    }
  }, [query, repository]);

  useEffect(() => {
    void reload();

    return repository.subscribe(() => {
      void reload();
    });
  }, [repository, reload]);

  return { ...state, reload };
}
