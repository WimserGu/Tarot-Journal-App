import type {
  CardOrientation,
  QuestionTemplate,
  Reading,
  ReadingCard,
  TarotCard,
  Topic,
} from '../../domain/types';

export type HomeTopicIcon = 'book' | 'briefcase' | 'document' | 'heart';

export type LastCardSummary = {
  card_key: string;
  name_zh: string;
  orientation: CardOrientation;
};

export type TodayQuestionSummary = {
  question_template: QuestionTemplate;
  topic: Topic;
  last_reading_at: string | null;
  last_card: LastCardSummary | null;
  is_completed_today: boolean;
};

export type TopicSummary = {
  topic: Topic;
  icon: HomeTopicIcon;
  record_count: number;
};

export type HomeData = {
  greeting: string;
  today_questions: TodayQuestionSummary[];
  topics: TopicSummary[];
};

export type HomeDataInput = {
  now: Date;
  time_zone: string;
  topics: readonly Topic[];
  question_templates: readonly QuestionTemplate[];
  readings: readonly Reading[];
  reading_cards: readonly ReadingCard[];
  tarot_cards: readonly TarotCard[];
};

function getDateKey(value: Date | string, timeZone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Expected a valid date.');
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new RangeError('Unable to format a calendar date.');
  }

  return `${year}-${month}-${day}`;
}

function calendarDaysBetween(from: Date, to: Date, timeZone: string): number {
  const fromDate = Date.parse(`${getDateKey(from, timeZone)}T00:00:00.000Z`);
  const toDate = Date.parse(`${getDateKey(to, timeZone)}T00:00:00.000Z`);

  return Math.floor((toDate - fromDate) / 86_400_000);
}

function getLatestCompletedReading(
  questionTemplateId: string,
  readings: readonly Reading[],
): Reading | undefined {
  return readings
    .filter(
      (reading) =>
        reading.status === 'completed' && reading.question_template_id === questionTemplateId,
    )
    .sort((first, second) => Date.parse(second.reading_at) - Date.parse(first.reading_at))[0];
}

function getLastCardSummary(
  reading: Reading | undefined,
  readingCards: readonly ReadingCard[],
  tarotCards: readonly TarotCard[],
): LastCardSummary | null {
  if (!reading) {
    return null;
  }

  const readingCard = readingCards
    .filter((card) => card.reading_id === reading.id && card.tarot_card_id !== null)
    .sort((first, second) => first.position_order - second.position_order)[0];

  if (!readingCard || readingCard.tarot_card_id === null) {
    return null;
  }

  const tarotCard = tarotCards.find((card) => card.id === readingCard.tarot_card_id);

  if (!tarotCard) {
    return null;
  }

  return {
    card_key: tarotCard.card_key,
    name_zh: tarotCard.name_zh,
    orientation: readingCard.orientation,
  };
}

function isQuestionDueToday(
  template: QuestionTemplate,
  latestReading: Reading | undefined,
  now: Date,
  timeZone: string,
): boolean {
  if (template.frequency === 'as_needed') {
    return false;
  }

  if (!latestReading) {
    return true;
  }

  const completedToday =
    getDateKey(latestReading.reading_at, timeZone) === getDateKey(now, timeZone);

  if (completedToday || template.frequency === 'daily') {
    return true;
  }

  return calendarDaysBetween(new Date(latestReading.reading_at), now, timeZone) >= 7;
}

function getTopicIcon(topic: Topic): HomeTopicIcon {
  if (topic.title.includes('论文')) {
    return 'document';
  }

  if (topic.title.includes('关系')) {
    return 'heart';
  }

  if (topic.title.includes('事业')) {
    return 'briefcase';
  }

  return 'book';
}

export function getTimeGreeting(now: Date): string {
  const hour = now.getHours();

  if (hour < 12) {
    return '早上好';
  }

  if (hour < 18) {
    return '下午好';
  }

  return '晚上好';
}

export function formatHomeDate(value: Date | string, timeZone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function buildHomeData({
  now,
  time_zone,
  topics,
  question_templates,
  readings,
  reading_cards,
  tarot_cards,
}: HomeDataInput): HomeData {
  const activeTopics = topics.filter((topic) => topic.archived_at === null);
  const activeTopicById = new Map(activeTopics.map((topic) => [topic.id, topic]));

  const todayQuestions = question_templates
    .filter((template) => template.is_active)
    .flatMap((template) => {
      const topic = activeTopicById.get(template.topic_id);
      const latestReading = getLatestCompletedReading(template.id, readings);

      if (!topic || !isQuestionDueToday(template, latestReading, now, time_zone)) {
        return [];
      }

      return [
        {
          question_template: template,
          topic,
          last_reading_at: latestReading?.reading_at ?? null,
          last_card: getLastCardSummary(latestReading, reading_cards, tarot_cards),
          is_completed_today:
            latestReading !== undefined &&
            getDateKey(latestReading.reading_at, time_zone) === getDateKey(now, time_zone),
        },
      ];
    })
    .sort((first, second) => {
      if (first.question_template.is_pinned !== second.question_template.is_pinned) {
        return first.question_template.is_pinned ? -1 : 1;
      }

      return first.question_template.question_text.localeCompare(
        second.question_template.question_text,
        'zh-CN',
      );
    });

  const topicSummaries = activeTopics
    .map((topic) => ({
      topic,
      icon: getTopicIcon(topic),
      record_count: readings.filter(
        (reading) => reading.status === 'completed' && reading.topic_id === topic.id,
      ).length,
    }))
    .sort(
      (first, second) => Date.parse(second.topic.updated_at) - Date.parse(first.topic.updated_at),
    );

  return {
    greeting: getTimeGreeting(now),
    today_questions: todayQuestions,
    topics: topicSummaries,
  };
}
