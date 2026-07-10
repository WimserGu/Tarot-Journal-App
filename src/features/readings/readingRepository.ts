import type {
  CardOrientation,
  ISODateTime,
  QuestionTemplate,
  QuestionTemplatePosition,
  Reading,
  ReadingCard,
  ReadingStatus,
  TarotCard,
  Topic,
  UUID,
} from '../../domain/types';
import type { JournalData } from '../../repositories/journalData';

export type ReadingCardInput = {
  tarot_card_id: number | null;
  position_name: string | null;
  orientation: CardOrientation;
  position_order: number;
};

export type CreateReadingInput = {
  topic_id: UUID;
  question_template_id: UUID | null;
  temporary_question: string | null;
  reading_at: ISODateTime;
  reading_timezone: string;
  interpretation: string | null;
  status: ReadingStatus;
  cards: ReadingCardInput[];
};

export type UpdateReadingInput = CreateReadingInput;

export type ReadingFormContext = {
  topics: Topic[];
  question_templates: QuestionTemplate[];
  question_template_positions: QuestionTemplatePosition[];
  tarot_cards: TarotCard[];
};

export type ReadingDetailCard = {
  reading_card: ReadingCard;
  tarot_card: TarotCard | null;
};

export type ReadingDetail = {
  reading: Reading;
  topic: Topic;
  question_template: QuestionTemplate | null;
  question_text: string;
  cards: ReadingDetailCard[];
};

export type ReadingDeletionSummary = {
  reading_id: UUID;
  card_count: number;
};

export interface ReadingRepository {
  getReadingFormContext(): Promise<ReadingFormContext>;
  createReading(input: CreateReadingInput): Promise<Reading>;
  updateReading(readingId: UUID, input: UpdateReadingInput): Promise<Reading>;
  deleteReading(readingId: UUID): Promise<ReadingDeletionSummary>;
  toggleFavorite(readingId: UUID): Promise<Reading>;
  getReadingDetail(readingId: UUID): Promise<ReadingDetail | null>;
  subscribe(listener: () => void): () => void;
}

export class ReadingNotFoundError extends Error {
  constructor() {
    super('未找到这条记录。');
    this.name = 'ReadingNotFoundError';
  }
}

export class ReadingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadingValidationError';
  }
}

function timestamp(value: ISODateTime): number {
  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeOptionalText(value: string | null): string | null {
  const normalized = value?.trim() ?? '';

  return normalized.length > 0 ? normalized : null;
}

function findOwnedActiveTopic(data: JournalData, userId: UUID, topicId: UUID): Topic | undefined {
  return data.topics.find(
    (topic) => topic.id === topicId && topic.user_id === userId && topic.archived_at === null,
  );
}

function findOwnedTemplate(
  data: JournalData,
  userId: UUID,
  templateId: UUID,
): QuestionTemplate | undefined {
  return data.question_templates.find(
    (template) => template.id === templateId && template.user_id === userId,
  );
}

function validateCardOrders(cards: readonly ReadingCardInput[]): void {
  const orders = cards.map((card) => card.position_order);
  const uniqueOrders = new Set(orders);

  if (uniqueOrders.size !== cards.length) {
    throw new ReadingValidationError('同一条记录中的牌序不能重复。');
  }

  for (let positionOrder = 1; positionOrder <= cards.length; positionOrder += 1) {
    if (!uniqueOrders.has(positionOrder)) {
      throw new ReadingValidationError('同一条记录中的牌序必须从 1 开始连续编号。');
    }
  }
}

function validateCardInput(
  card: ReadingCardInput,
  tarotCardIds: ReadonlySet<number>,
  status: ReadingStatus,
): ReadingCardInput {
  if (!Number.isInteger(card.position_order) || card.position_order < 1) {
    throw new ReadingValidationError('牌序必须是从 1 开始的正整数。');
  }

  if (card.orientation !== 'upright' && card.orientation !== 'reversed') {
    throw new ReadingValidationError('每张牌都需要选择正位或逆位。');
  }

  if (card.tarot_card_id !== null && !tarotCardIds.has(card.tarot_card_id)) {
    throw new ReadingValidationError('选择的塔罗牌不存在。');
  }

  if (status === 'completed' && card.tarot_card_id === null) {
    throw new ReadingValidationError('正式记录中的每个牌位都必须选择塔罗牌。');
  }

  const positionName = normalizeOptionalText(card.position_name);

  if (positionName !== null && positionName.length > 120) {
    throw new ReadingValidationError('牌阵位置名称不能超过 120 个字符。');
  }

  return {
    ...card,
    position_name: positionName,
  };
}

export type ValidatedReadingCreateInput = Omit<
  CreateReadingInput,
  'cards' | 'temporary_question'
> & {
  cards: ReadingCardInput[];
  question_text_snapshot: string;
};

/** Validates the persistence boundary for both form and future API clients. */
export function validateReadingCreateInput(
  data: JournalData,
  userId: UUID,
  input: CreateReadingInput,
): ValidatedReadingCreateInput {
  const topic = findOwnedActiveTopic(data, userId, input.topic_id);

  if (!topic) {
    throw new ReadingValidationError('请选择一个可用的长期议题。');
  }

  if (input.status !== 'draft' && input.status !== 'completed') {
    throw new ReadingValidationError('记录状态无效。');
  }

  if (Number.isNaN(Date.parse(input.reading_at))) {
    throw new ReadingValidationError('记录日期或时间无效。');
  }

  const readingTimezone = input.reading_timezone.trim();

  if (readingTimezone.length === 0 || readingTimezone.length > 100) {
    throw new ReadingValidationError('记录时区无效。');
  }

  const interpretation = normalizeOptionalText(input.interpretation);

  if (interpretation !== null && interpretation.length > 5000) {
    throw new ReadingValidationError('个人解读不能超过 5000 个字符。');
  }

  let questionText: string;

  if (input.question_template_id !== null) {
    const template = findOwnedTemplate(data, userId, input.question_template_id);

    if (!template || !template.is_active || template.topic_id !== topic.id) {
      throw new ReadingValidationError('选择的固定问题不属于当前议题或已停用。');
    }

    questionText = template.question_text;
  } else {
    const temporaryQuestion = normalizeOptionalText(input.temporary_question);

    if (temporaryQuestion === null) {
      throw new ReadingValidationError('请输入问题文字。');
    }

    if (temporaryQuestion.length > 1000) {
      throw new ReadingValidationError('问题文字不能超过 1000 个字符。');
    }

    questionText = temporaryQuestion;
  }

  if (input.status === 'completed' && input.cards.length === 0) {
    throw new ReadingValidationError('正式记录至少需要一张牌。');
  }

  validateCardOrders(input.cards);
  const tarotCardIds = new Set(data.tarot_cards.map((card) => card.id));
  const cards = input.cards.map((card) => validateCardInput(card, tarotCardIds, input.status));

  return {
    topic_id: topic.id,
    question_template_id: input.question_template_id,
    question_text_snapshot: questionText,
    reading_at: input.reading_at,
    reading_timezone: readingTimezone,
    interpretation,
    status: input.status,
    cards,
  };
}

export function buildReadingFormContext(data: JournalData, userId: UUID): ReadingFormContext {
  const activeTopics = data.topics
    .filter((topic) => topic.user_id === userId && topic.archived_at === null)
    .sort((first, second) => {
      if (first.is_pinned !== second.is_pinned) {
        return first.is_pinned ? -1 : 1;
      }

      return timestamp(second.updated_at) - timestamp(first.updated_at);
    });
  const topicIds = new Set(activeTopics.map((topic) => topic.id));

  return {
    topics: activeTopics,
    question_templates: data.question_templates
      .filter(
        (template) =>
          template.user_id === userId && template.is_active && topicIds.has(template.topic_id),
      )
      .sort((first, second) => {
        if (first.is_pinned !== second.is_pinned) {
          return first.is_pinned ? -1 : 1;
        }

        return first.question_text.localeCompare(second.question_text, 'zh-CN');
      }),
    question_template_positions: data.question_template_positions
      .filter((position) => position.user_id === userId)
      .sort((first, second) => first.position_order - second.position_order),
    tarot_cards: [...data.tarot_cards].sort(
      (first, second) => first.sort_order - second.sort_order,
    ),
  };
}

export function buildReadingDetail(
  data: JournalData,
  userId: UUID,
  readingId: UUID,
): ReadingDetail | null {
  const reading = data.readings.find(
    (candidate) => candidate.id === readingId && candidate.user_id === userId,
  );

  if (!reading || reading.topic_id === null) {
    return null;
  }

  const topic = findOwnedActiveTopic(data, userId, reading.topic_id);

  if (!topic) {
    return null;
  }

  const questionTemplate = reading.question_template_id
    ? (findOwnedTemplate(data, userId, reading.question_template_id) ?? null)
    : null;
  const tarotCardById = new Map(data.tarot_cards.map((card) => [card.id, card]));
  const cards = data.reading_cards
    .filter((card) => card.user_id === userId && card.reading_id === reading.id)
    .sort((first, second) => first.position_order - second.position_order)
    .map((readingCard) => ({
      reading_card: readingCard,
      tarot_card:
        readingCard.tarot_card_id === null
          ? null
          : (tarotCardById.get(readingCard.tarot_card_id) ?? null),
    }));

  return {
    reading,
    topic,
    question_template: questionTemplate,
    question_text:
      reading.question_text_snapshot ?? questionTemplate?.question_text ?? '未命名问题',
    cards,
  };
}
