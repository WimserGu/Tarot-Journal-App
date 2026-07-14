import type { QuestionTemplateRepository } from '../questions/questionTemplateRepository';
import type { ReadingRepository } from '../readings/readingRepository';
import type { TopicListItem, TopicRepository } from '../topics/topicRepository';
import {
  questionTemplateRepository,
  readingRepository,
  topicRepository,
} from '../../repositories/repositoryFactory';
import type { StatisticsReading } from './statisticsTypes';

export interface StatisticsRepository {
  listReadings(): Promise<StatisticsReading[]>;
  listTopics(): Promise<TopicListItem[]>;
  subscribe(listener: () => void): () => void;
}

export class RepositoryStatisticsRepository implements StatisticsRepository {
  constructor(
    private readonly readings: ReadingRepository,
    private readonly topics: TopicRepository,
    private readonly questions: QuestionTemplateRepository,
  ) {}
  async listTopics(): Promise<TopicListItem[]> {
    return this.topics.listTopics();
  }
  async listReadings(): Promise<StatisticsReading[]> {
    const [timeline, topicItems] = await Promise.all([
      this.readings.listReadings(),
      this.topics.listTopics(),
    ]);
    const topicById = new Map(topicItems.map((item) => [item.topic.id, item.topic]));
    const templates = (
      await Promise.all(
        topicItems.map((item) => this.questions.listQuestionTemplates(item.topic.id)),
      )
    ).flat();
    const templateById = new Map(templates.map((template) => [template.id, template]));
    return timeline.map((item) => ({
      reading: item.reading,
      cards: item.cards.flatMap((card) =>
        card.tarot_card
          ? [
              {
                orientation: card.orientation,
                reversalVariant: card.reversalVariant,
                tarotCard: card.tarot_card,
                positionOrder: card.position_order,
              },
            ]
          : [],
      ),
      topic: item.reading.topic_id ? (topicById.get(item.reading.topic_id) ?? null) : null,
      questionTemplate: item.reading.question_template_id
        ? (templateById.get(item.reading.question_template_id) ?? item.question_template)
        : null,
      questionText: item.question_text,
    }));
  }
  subscribe(listener: () => void): () => void {
    const stops = [
      this.readings.subscribe(listener),
      this.topics.subscribe(listener),
      this.questions.subscribe(listener),
    ];
    return () => stops.forEach((stop) => stop());
  }
}

export const statisticsRepository: StatisticsRepository = new RepositoryStatisticsRepository(
  readingRepository,
  topicRepository,
  questionTemplateRepository,
);
