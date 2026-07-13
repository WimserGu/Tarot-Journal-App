import { useCallback, useEffect, useState } from 'react';
import { reviewRepository } from '../../repositories/repositoryFactory';
import type { ReviewListItem, ReviewType } from './reviewTypes';

export function useReviewList(reviewType?: ReviewType) {
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setReviews(await reviewRepository.listReviews({ reviewType }));
      setError(null);
    } catch {
      setError('无法加载已保存的回顾。');
    } finally {
      setLoading(false);
    }
  }, [reviewType]);
  useEffect(() => {
    void load();
    return reviewRepository.subscribe(() => void load());
  }, [load]);
  return { reviews, loading, error };
}
