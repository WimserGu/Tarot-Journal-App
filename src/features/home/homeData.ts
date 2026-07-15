import type {
  CardOrientation,
  ReversalVariant,
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
  reversalVariant: ReversalVariant;
  tarot_card_id: number;
};

export type TodayQuestionSummary = {
  question_template: QuestionTemplate;
  topic: Topic;
  last_reading_at: string | null;
  last_cards: LastCardSummary[];
  is_completed_today: boolean;
};

export type TopicSummary = {
  topic: Topic;
  icon: HomeTopicIcon;
  record_count: number;
};

export type RecentReadingSummary = {
  cards: LastCardSummary[];
  is_today: boolean;
  question_text: string;
  reading: Reading;
  topic: Topic | null;
};

export type HomeData = {
  greeting: string;
  recent_reading: RecentReadingSummary | null;
  today_questions: TodayQuestionSummary[];
  topics: TopicSummary[];
};

export type HomeDataInput = {
  now: Date;
  time_zone: string;
  topics: readonly Topic[];
  question_templates: readonly QuestionTemplate[];
  readings: readonly Reading[];
  reading_cards: readonly Pick<
    ReadingCard,
    'orientation' | 'position_order' | 'reading_id' | 'reversalVariant' | 'tarot_card_id'
  >[];
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

function getLastCardSummaries(
  reading: Reading | undefined,
  readingCards: HomeDataInput['reading_cards'],
  tarotCards: readonly TarotCard[],
): LastCardSummary[] {
  if (!reading) {
    return [];
  }

  return readingCards
    .filter((card) => card.reading_id === reading.id && card.tarot_card_id !== null)
    .sort((first, second) => first.position_order - second.position_order)
    .flatMap((readingCard) => {
      const tarotCard = tarotCards.find((card) => card.id === readingCard.tarot_card_id);
      return tarotCard
        ? [
            {
              card_key: tarotCard.card_key,
              name_zh: tarotCard.name_zh,
              orientation: readingCard.orientation,
              reversalVariant: readingCard.reversalVariant,
              tarot_card_id: tarotCard.id,
            },
          ]
        : [];
    });
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
          last_cards: getLastCardSummaries(latestReading, reading_cards, tarot_cards),
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

  const latestCompletedReading = [...readings]
    .filter((reading) => reading.status === 'completed')
    .sort((first, second) => Date.parse(second.reading_at) - Date.parse(first.reading_at))[0];
  const latestTemplate = latestCompletedReading?.question_template_id
    ? question_templates.find(
        (template) => template.id === latestCompletedReading.question_template_id,
      )
    : null;
  const recentReading = latestCompletedReading
    ? {
        cards: getLastCardSummaries(latestCompletedReading, reading_cards, tarot_cards),
        is_today:
          getDateKey(latestCompletedReading.reading_at, time_zone) === getDateKey(now, time_zone),
        question_text:
          latestCompletedReading.question_text_snapshot ??
          latestTemplate?.question_text ??
          '未命名问题',
        reading: latestCompletedReading,
        topic: latestCompletedReading.topic_id
          ? (activeTopicById.get(latestCompletedReading.topic_id) ?? null)
          : null,
      }
    : null;

  return {
    greeting: getTimeGreeting(now),
    recent_reading: recentReading,
    today_questions: todayQuestions,
    topics: topicSummaries,
  };
}
