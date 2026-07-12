import type {
  ISODateTime,
  QuestionTemplate,
  Reading,
  ReadingCard,
  TarotCard,
  Topic,
  UUID,
} from '../../domain/types';
import type { JournalData } from '../../repositories/journalData';
import { NotFoundRepositoryError } from '../../repositories/repositoryErrors';

import type { TopicFormValues } from './topicSchema';

export type TopicRepositoryData = JournalData;

export type TopicListItem = {
  topic: Topic;
  fixed_question_count: number;
  record_count: number;
  latest_activity_at: ISODateTime;
};

export type TopicCardOccurrence = {
  tarot_card: TarotCard;
  occurrence_count: number;
};

export type TopicRecentReading = {
  reading: Reading;
  question_text: string;
  cards: {
    tarot_card: TarotCard;
    orientation: ReadingCard['orientation'];
    position_name: string | null;
    position_order: number;
  }[];
};

export type TopicDeletionSummary = {
  topic_id: UUID;
  topic_title: string;
  question_count: number;
  reading_count: number;
  reading_card_count: number;
};

export type TopicDetail = {
  topic: Topic;
  fixed_questions: QuestionTemplate[];
  recent_readings: TopicRecentReading[];
  record_count: number;
  most_frequent_cards: TopicCardOccurrence[];
  deletion_summary: TopicDeletionSummary;
};

/**
 * Pages depend on this contract rather than the mock implementation, so a
 * Supabase-backed repository can later replace it without changing UI code.
 */
export interface TopicRepository {
  listTopics(): Promise<TopicListItem[]>;
  getTopicDetail(topicId: UUID): Promise<TopicDetail | null>;
  createTopic(input: TopicFormValues): Promise<Topic>;
  updateTopic(topicId: UUID, input: TopicFormValues): Promise<Topic>;
  deleteTopic(topicId: UUID): Promise<TopicDeletionSummary>;
  subscribe(listener: () => void): () => void;
}

export class TopicNotFoundError extends NotFoundRepositoryError {
  constructor() {
    super('未找到这个长期议题。');
    this.name = 'TopicNotFoundError';
  }
}

function timestamp(value: ISODateTime): number {
  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByLatestActivity(first: TopicListItem, second: TopicListItem): number {
  if (first.topic.is_pinned !== second.topic.is_pinned) {
    return first.topic.is_pinned ? -1 : 1;
  }

  return timestamp(second.latest_activity_at) - timestamp(first.latest_activity_at);
}

function sortQuestions(first: QuestionTemplate, second: QuestionTemplate): number {
  if (first.is_pinned !== second.is_pinned) {
    return first.is_pinned ? -1 : 1;
  }

  if (first.is_active !== second.is_active) {
    return first.is_active ? -1 : 1;
  }

  return timestamp(second.updated_at) - timestamp(first.updated_at);
}

function getLatestActivityAt(topic: Topic, readings: readonly Reading[]): ISODateTime {
  return readings.reduce<ISODateTime>((latest, reading) => {
    return timestamp(reading.updated_at) > timestamp(latest) ? reading.updated_at : latest;
  }, topic.updated_at);
}

function ownedActiveTopics(data: TopicRepositoryData, userId: UUID): Topic[] {
  return data.topics.filter((topic) => topic.user_id === userId && topic.archived_at === null);
}

function ownedTopic(data: TopicRepositoryData, userId: UUID, topicId: UUID): Topic | undefined {
  return data.topics.find(
    (topic) => topic.id === topicId && topic.user_id === userId && topic.archived_at === null,
  );
}

function topicReadings(data: TopicRepositoryData, userId: UUID, topicId: UUID): Reading[] {
  return data.readings.filter(
    (reading) => reading.user_id === userId && reading.topic_id === topicId,
  );
}

export function buildTopicListItems(data: TopicRepositoryData, userId: UUID): TopicListItem[] {
  return ownedActiveTopics(data, userId)
    .map((topic) => {
      const readings = topicReadings(data, userId, topic.id);

      return {
        topic,
        fixed_question_count: data.question_templates.filter(
          (question) => question.user_id === userId && question.topic_id === topic.id,
        ).length,
        record_count: readings.length,
        latest_activity_at: getLatestActivityAt(topic, readings),
      };
    })
    .sort(sortByLatestActivity);
}

export function buildTopicDeletionSummary(
  data: TopicRepositoryData,
  userId: UUID,
  topicId: UUID,
): TopicDeletionSummary | null {
  const topic = ownedTopic(data, userId, topicId);

  if (!topic) {
    return null;
  }

  const readings = topicReadings(data, userId, topic.id);
  const readingIds = new Set(readings.map((reading) => reading.id));

  return {
    topic_id: topic.id,
    topic_title: topic.title,
    question_count: data.question_templates.filter(
      (question) => question.user_id === userId && question.topic_id === topic.id,
    ).length,
    reading_count: readings.length,
    reading_card_count: data.reading_cards.filter(
      (card) => card.user_id === userId && readingIds.has(card.reading_id),
    ).length,
  };
}

export function buildTopicDetail(
  data: TopicRepositoryData,
  userId: UUID,
  topicId: UUID,
): TopicDetail | null {
  const topic = ownedTopic(data, userId, topicId);
  const deletionSummary = buildTopicDeletionSummary(data, userId, topicId);

  if (!topic || !deletionSummary) {
    return null;
  }

  const fixedQuestions = data.question_templates
    .filter((question) => question.user_id === userId && question.topic_id === topic.id)
    .sort(sortQuestions);
  const questionById = new Map(fixedQuestions.map((question) => [question.id, question]));
  const readings = topicReadings(data, userId, topic.id);
  const readingCardsByReadingId = new Map<UUID, ReadingCard[]>();

  data.reading_cards
    .filter((card) => card.user_id === userId)
    .forEach((card) => {
      const currentCards = readingCardsByReadingId.get(card.reading_id) ?? [];
      currentCards.push(card);
      readingCardsByReadingId.set(card.reading_id, currentCards);
    });

  const tarotCardById = new Map(data.tarot_cards.map((card) => [card.id, card]));
  const cardCounts = new Map<number, number>();

  readings
    .filter((reading) => reading.status === 'completed')
    .forEach((reading) => {
      (readingCardsByReadingId.get(reading.id) ?? []).forEach((readingCard) => {
        if (readingCard.tarot_card_id !== null && tarotCardById.has(readingCard.tarot_card_id)) {
          const currentCount = cardCounts.get(readingCard.tarot_card_id) ?? 0;
          cardCounts.set(readingCard.tarot_card_id, currentCount + 1);
        }
      });
    });

  const sortedCardOccurrences = [...cardCounts.entries()]
    .flatMap(([tarotCardId, occurrenceCount]) => {
      const tarotCard = tarotCardById.get(tarotCardId);

      return tarotCard ? [{ tarot_card: tarotCard, occurrence_count: occurrenceCount }] : [];
    })
    .sort((first, second) => {
      if (first.occurrence_count !== second.occurrence_count) {
        return second.occurrence_count - first.occurrence_count;
      }

      return first.tarot_card.sort_order - second.tarot_card.sort_order;
    });
  const highestOccurrence = sortedCardOccurrences[0]?.occurrence_count;
  const mostFrequentCards =
    highestOccurrence === undefined
      ? []
      : sortedCardOccurrences.filter((card) => card.occurrence_count === highestOccurrence);

  const recentReadings = [...readings]
    .sort((first, second) => timestamp(second.reading_at) - timestamp(first.reading_at))
    .slice(0, 5)
    .map((reading) => {
      const cards = (readingCardsByReadingId.get(reading.id) ?? [])
        .sort((first, second) => first.position_order - second.position_order)
        .flatMap((readingCard) => {
          if (readingCard.tarot_card_id === null) {
            return [];
          }

          const tarotCard = tarotCardById.get(readingCard.tarot_card_id);

          return tarotCard
            ? [
                {
                  tarot_card: tarotCard,
                  orientation: readingCard.orientation,
                  position_name: readingCard.position_name,
                  position_order: readingCard.position_order,
                },
              ]
            : [];
        });
      const template = reading.question_template_id
        ? questionById.get(reading.question_template_id)
        : undefined;

      return {
        reading,
        question_text: reading.question_text_snapshot ?? template?.question_text ?? '临时问题',
        cards,
      };
    });

  return {
    topic,
    fixed_questions: fixedQuestions,
    recent_readings: recentReadings,
    record_count: readings.length,
    most_frequent_cards: mostFrequentCards,
    deletion_summary: deletionSummary,
  };
}
