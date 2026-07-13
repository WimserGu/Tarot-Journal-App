import { useCallback, useEffect, useState } from 'react';
import type { UUID } from '../../domain/types';
import { followUpRepository } from '../../repositories/repositoryFactory';
import type { FollowUpRepository } from './followUpRepository';
import type {
  FollowUpListFilter,
  FollowUpPendingFilter,
  ReadingFollowUpDetail,
  ReadingFollowUpListItem,
} from './followUpTypes';

function message(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '暂时无法加载回顾。';
}

export function usePendingFollowUps(
  filter: FollowUpPendingFilter,
  repository: FollowUpRepository = followUpRepository,
) {
  const { limit, now, timezone } = filter;
  const [items, setItems] = useState<ReadingFollowUpListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await repository.listPending({ limit, now, timezone }));
      setError(null);
    } catch (value) {
      setError(message(value));
    } finally {
      setLoading(false);
    }
  }, [limit, now, repository, timezone]);
  useEffect(() => {
    void load();
    return repository.subscribe(() => void load());
  }, [load, repository]);
  return { items, loading, error, reload: load };
}

export function useFollowUpList(
  filter: FollowUpListFilter,
  repository: FollowUpRepository = followUpRepository,
) {
  const { status } = filter;
  const [items, setItems] = useState<ReadingFollowUpListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await repository.listFollowUps({ status }));
      setError(null);
    } catch (value) {
      setError(message(value));
    } finally {
      setLoading(false);
    }
  }, [repository, status]);
  useEffect(() => {
    void load();
    return repository.subscribe(() => void load());
  }, [load, repository]);
  return { items, loading, error, reload: load };
}

export function useFollowUpDetail(
  id: UUID | undefined,
  repository: FollowUpRepository = followUpRepository,
) {
  const [data, setData] = useState<ReadingFollowUpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError('缺少回顾标识。');
      return;
    }
    setLoading(true);
    try {
      setData(await repository.getFollowUp(id));
      setError(null);
    } catch (value) {
      setError(message(value));
    } finally {
      setLoading(false);
    }
  }, [id, repository]);
  useEffect(() => {
    void load();
    return repository.subscribe(() => void load());
  }, [load, repository]);
  return { data, loading, error, reload: load };
}

export function useReadingFollowUps(
  readingId: UUID | undefined,
  repository: FollowUpRepository = followUpRepository,
) {
  const [items, setItems] = useState<Awaited<ReturnType<FollowUpRepository['listForReading']>>>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!readingId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(await repository.listForReading(readingId));
    setLoading(false);
  }, [readingId, repository]);
  useEffect(() => {
    void load();
    return repository.subscribe(() => void load());
  }, [load, repository]);
  return { items, loading, reload: load };
}
