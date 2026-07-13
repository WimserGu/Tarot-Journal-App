import { z } from 'zod';

import type { CardEntrySource, ReadingStatus, ReversalExpression, UUID } from '../../domain/types';

import type { CreateReadingInput, ReadingCardInput } from './readingRepository';

export type ReadingQuestionMode = 'template' | 'temporary';

export type ReadingCardFormValue = {
  tarot_card_id: number | null;
  position_name: string;
  orientation: 'upright' | 'reversed';
  reversalExpression?: ReversalExpression;
  source?: CardEntrySource;
  drawSessionId?: UUID | null;
  spreadPositionId?: string | null;
};

function isValidLocalDate(value: string): boolean {
  const matches = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!matches) {
    return false;
  }

  const year = Number(matches[1]);
  const month = Number(matches[2]);
  const day = Number(matches[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidLocalTime(value: string): boolean {
  const matches = /^(\d{2}):(\d{2})$/.exec(value);

  if (!matches) {
    return false;
  }

  const hour = Number(matches[1]);
  const minute = Number(matches[2]);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export const readingCardFormSchema = z
  .object({
    tarot_card_id: z.number().int().positive().nullable(),
    position_name: z.string().trim().max(120, '牌阵位置不能超过 120 个字符。'),
    orientation: z.enum(['upright', 'reversed']),
    reversalExpression: z.enum(['underexpressed', 'overexpressed']).nullable().optional(),
    source: z.enum(['drawn', 'manual']).optional(),
    drawSessionId: z.string().nullable().optional(),
    spreadPositionId: z.string().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.orientation === 'upright' && value.reversalExpression !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '正位牌不能设置逆位表达状态。',
        path: ['reversalExpression'],
      });
    }
    if ((value.source ?? 'manual') === 'manual' && (value.drawSessionId ?? null) !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '手动添加的牌不能关联抽牌会话。',
        path: ['drawSessionId'],
      });
    }
  });

export const readingFormSchema = z
  .object({
    spread_id: z.string().trim().nullable(),
    topic_id: z.string().trim().min(1, '请选择长期议题。'),
    question_mode: z.enum(['template', 'temporary']),
    question_template_id: z.string().trim().nullable(),
    temporary_question: z.string().trim().max(1000, '问题文字不能超过 1000 个字符。'),
    reading_date: z.string().refine(isValidLocalDate, '请输入有效日期，例如 2026-07-10。'),
    reading_time: z.string().refine(isValidLocalTime, '请输入有效时间，例如 08:30。'),
    cards: z.array(readingCardFormSchema),
    interpretation: z.string().trim().max(5000, '个人解读不能超过 5000 个字符。'),
  })
  .superRefine((value, context) => {
    if (value.question_mode === 'template' && value.question_template_id === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请选择固定问题，或切换为临时问题。',
        path: ['question_template_id'],
      });
    }

    if (value.question_mode === 'temporary' && value.temporary_question.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请输入临时问题。',
        path: ['temporary_question'],
      });
    }
  });

export type ReadingFormValues = z.infer<typeof readingFormSchema>;

export function createEmptyReadingCard(): ReadingCardFormValue {
  return {
    tarot_card_id: null,
    position_name: '',
    orientation: 'upright',
    reversalExpression: null,
    source: 'manual',
    drawSessionId: null,
    spreadPositionId: 'open.card.1',
  };
}

export function getMeaningfulReadingCards(
  cards: readonly ReadingCardFormValue[],
): ReadingCardFormValue[] {
  return cards.filter(
    (card) => card.tarot_card_id !== null || card.position_name.trim().length > 0,
  );
}

export function getCompletedCardsError(cards: readonly ReadingCardFormValue[]): string | null {
  const meaningfulCards = getMeaningfulReadingCards(cards);

  if (meaningfulCards.length === 0) {
    return '正式记录至少需要一张牌。';
  }

  if (meaningfulCards.some((card) => card.tarot_card_id === null)) {
    return '请为每个已添加的牌位选择塔罗牌。';
  }

  return null;
}

function toIsoDateTime(date: string, time: string): string {
  const localDateTime = new Date(`${date}T${time}:00`);

  if (Number.isNaN(localDateTime.getTime())) {
    throw new RangeError('记录日期或时间无效。');
  }

  return localDateTime.toISOString();
}

export function toReadingCreateInput(
  values: ReadingFormValues,
  status: ReadingStatus,
  timeZone: string,
): CreateReadingInput {
  const cards = getMeaningfulReadingCards(values.cards).map<ReadingCardInput>((card, index) => ({
    tarot_card_id: card.tarot_card_id,
    position_name: card.position_name.trim() || null,
    orientation: card.orientation,
    reversalExpression: card.reversalExpression ?? null,
    source: card.source ?? 'manual',
    drawSessionId: card.drawSessionId ?? null,
    spreadPositionId: card.spreadPositionId ?? null,
    position_order: index + 1,
  }));

  return {
    spread_id: values.spread_id,
    topic_id: values.topic_id,
    question_template_id: values.question_mode === 'template' ? values.question_template_id : null,
    temporary_question:
      values.question_mode === 'temporary' ? values.temporary_question.trim() || null : null,
    reading_at: toIsoDateTime(values.reading_date, values.reading_time),
    reading_timezone: timeZone,
    interpretation: values.interpretation.trim() || null,
    status,
    cards,
  };
}

export function getDateTimeFields(
  now: Date,
  timeZone: string,
): {
  reading_date: string;
  reading_time: string;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => {
    return parts.find((candidate) => candidate.type === type)?.value;
  };
  const year = part('year');
  const month = part('month');
  const day = part('day');
  const hour = part('hour');
  const minute = part('minute');

  if (!year || !month || !day || !hour || !minute) {
    throw new RangeError('无法格式化当前日期和时间。');
  }

  return {
    reading_date: `${year}-${month}-${day}`,
    reading_time: `${hour}:${minute}`,
  };
}
