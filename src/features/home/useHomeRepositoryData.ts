import { useCallback, useEffect, useState } from 'react';

import type { QuestionTemplate, Reading, TarotCard, Topic } from '@/domain/types';
import {
  questionTemplateRepository,
  readingRepository,
  topicRepository,
} from '@/repositories/repositoryFactory';

import type { HomeDataInput } from './homeData';

type HomeRepositoryData = {
  questionTemplates: QuestionTemplate[];
  readingCards: HomeDataInput['reading_cards'];
  readings: Reading[];
  tarotCards: TarotCard[];
  topics: Topic[];
};

type HomeReadingCard = HomeDataInput['reading_cards'][number];

const EMPTY_DATA: HomeRepositoryData = {
  questionTemplates: [],
  readingCards: [],
  readings: [],
  tarotCards: [],
  topics: [],
};

export function useHomeRepositoryData() {
  const [data, setData] = useState<HomeRepositoryData>(EMPTY_DATA);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [topicItems, timeline] = await Promise.all([
        topicRepository.listTopics(),
        readingRepository.listReadings(),
      ]);
      const questionTemplates = (
        await Promise.all(
          topicItems.map((item) => questionTemplateRepository.listQuestionTemplates(item.topic.id)),
        )
      ).flat();
      const tarotCardsById = new Map<number, TarotCard>();
      const readingCards: HomeReadingCard[] = [];
      timeline.forEach((item) => {
        item.cards.forEach((card) => {
          if (!card.tarot_card) return;
          tarotCardsById.set(card.tarot_card.id, card.tarot_card);
          readingCards.push({
            orientation: card.orientation,
            position_order: card.position_order,
            reading_id: item.reading.id,
            reversalVariant: card.reversalVariant,
            tarot_card_id: card.tarot_card.id,
          });
        });
      });
      setData({
        questionTemplates,
        readingCards,
        readings: timeline.map((item) => item.reading),
        tarotCards: [...tarotCardsById.values()],
        topics: topicItems.map((item) => item.topic),
      });
    } catch {
      setError('暂时无法加载今日固定问题。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const stops = [
      topicRepository.subscribe(() => void reload()),
      questionTemplateRepository.subscribe(() => void reload()),
      readingRepository.subscribe(() => void reload()),
    ];
    return () => stops.forEach((stop) => stop());
  }, [reload]);

  return { data, error, loading, reload };
}
