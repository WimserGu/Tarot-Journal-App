import { useCallback, useEffect, useState } from 'react';
import type { TopicListItem } from '../topics/topicRepository';
import { statisticsRepository, type StatisticsRepository } from './statisticsRepository';
import type { StatisticsReading } from './statisticsTypes';

export function useStatisticsData(repository: StatisticsRepository = statisticsRepository) {
  const [readings, setReadings] = useState<StatisticsReading[]>([]);
  const [topics, setTopics] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextReadings, nextTopics] = await Promise.all([
        repository.listReadings(),
        repository.listTopics(),
      ]);
      setReadings(nextReadings);
      setTopics(nextTopics);
    } catch {
      setError('暂时无法加载统计数据。');
    } finally {
      setLoading(false);
    }
  }, [repository]);
  useEffect(() => {
    void load();
    return repository.subscribe(() => void load());
  }, [load, repository]);
  return { readings, topics, loading, error, reload: load };
}
