import type {
  CardOrientation,
  CardEntrySource,
  QuestionFrequency,
  QuestionTemplate,
  QuestionTemplatePosition,
  Reading,
  ReadingCard,
  ReadingStatus,
  ReversalExpression,
  Topic,
  TopicIcon,
} from '../domain/types';
import { ValidationRepositoryError } from './repositoryErrors';

type Row = Record<string, unknown>;

function fail(field: string): never {
  throw new ValidationRepositoryError(`Invalid database value for ${field}.`, 'map');
}
function string(row: Row, key: string): string {
  return typeof row[key] === 'string' ? row[key] : fail(key);
}
function nullableString(row: Row, key: string): string | null {
  return row[key] === null ? null : string(row, key);
}
function optionalNullableString(row: Row, key: string): string | null {
  return row[key] === undefined || row[key] === null ? null : string(row, key);
}
function boolean(row: Row, key: string): boolean {
  return typeof row[key] === 'boolean' ? row[key] : fail(key);
}
function integer(row: Row, key: string, positive = false): number {
  const value = row[key];
  return typeof value === 'number' && Number.isInteger(value) && (!positive || value > 0)
    ? value
    : fail(key);
}
function iso(row: Row, key: string): string {
  const value = string(row, key);
  return Number.isNaN(Date.parse(value)) ? fail(key) : value;
}
function enumValue<T extends string>(row: Row, key: string, allowed: readonly T[]): T {
  const value = string(row, key);
  return allowed.includes(value as T) ? (value as T) : fail(key);
}

export function mapTopicRow(row: Row): Topic {
  return {
    id: string(row, 'id'),
    user_id: string(row, 'user_id'),
    title: string(row, 'title'),
    description: nullableString(row, 'description'),
    icon: enumValue<TopicIcon>(row, 'icon', [
      'book',
      'briefcase',
      'compass',
      'heart',
      'moon',
      'sparkles',
    ]),
    is_pinned: boolean(row, 'is_pinned'),
    archived_at: row.archived_at === null ? null : iso(row, 'archived_at'),
    created_at: iso(row, 'created_at'),
    updated_at: iso(row, 'updated_at'),
  };
}

export function mapQuestionTemplateRow(row: Row): QuestionTemplate {
  return {
    id: string(row, 'id'),
    user_id: string(row, 'user_id'),
    topic_id: string(row, 'topic_id'),
    question_text: string(row, 'question_text'),
    frequency: enumValue<QuestionFrequency>(row, 'frequency', ['as_needed', 'daily', 'weekly']),
    is_active: boolean(row, 'is_active'),
    is_pinned: boolean(row, 'is_pinned'),
    displayOrder: integer(row, 'display_order', true),
    created_at: iso(row, 'created_at'),
    updated_at: iso(row, 'updated_at'),
  };
}

export function mapQuestionTemplatePositionRow(row: Row): QuestionTemplatePosition {
  return {
    id: string(row, 'id'),
    user_id: string(row, 'user_id'),
    question_template_id: string(row, 'question_template_id'),
    position_order: integer(row, 'position_order', true),
    position_name: string(row, 'position_name'),
    created_at: iso(row, 'created_at'),
    updated_at: iso(row, 'updated_at'),
  };
}

export function mapReadingRow(row: Row): Reading {
  return {
    id: string(row, 'id'),
    user_id: string(row, 'user_id'),
    topic_id: nullableString(row, 'topic_id'),
    question_template_id: nullableString(row, 'question_template_id'),
    question_text_snapshot: nullableString(row, 'question_text_snapshot'),
    spread_id: optionalNullableString(row, 'spread_id'),
    reading_at: iso(row, 'reading_at'),
    reading_timezone: string(row, 'reading_timezone'),
    interpretation: nullableString(row, 'interpretation'),
    reality_feedback: nullableString(row, 'reality_feedback'),
    status: enumValue<ReadingStatus>(row, 'status', ['draft', 'completed']),
    is_favorite: boolean(row, 'is_favorite'),
    created_at: iso(row, 'created_at'),
    updated_at: iso(row, 'updated_at'),
  };
}

export function mapReadingCardRow(row: Row): ReadingCard {
  const tarotCardId = row.tarot_card_id;
  const source =
    row.source === undefined
      ? 'manual'
      : enumValue<CardEntrySource>(row, 'source', ['drawn', 'manual']);
  const reversalExpression =
    row.reversal_expression === undefined || row.reversal_expression === null
      ? null
      : enumValue<Exclude<ReversalExpression, null>>(row, 'reversal_expression', [
          'underexpressed',
          'overexpressed',
        ]);
  const orientation = enumValue<CardOrientation>(row, 'orientation', ['upright', 'reversed']);
  if (orientation === 'upright' && reversalExpression !== null) fail('reversal_expression');
  const drawSessionId = optionalNullableString(row, 'draw_session_id');
  if (source === 'manual' && drawSessionId !== null) fail('draw_session_id');
  if (source === 'drawn' && drawSessionId === null) fail('draw_session_id');
  return {
    id: string(row, 'id'),
    user_id: string(row, 'user_id'),
    reading_id: string(row, 'reading_id'),
    tarot_card_id: tarotCardId === null ? null : integer(row, 'tarot_card_id', true),
    position_order: integer(row, 'position_order', true),
    position_name: nullableString(row, 'position_name'),
    spreadPositionId: optionalNullableString(row, 'spread_position_id'),
    orientation,
    reversalExpression,
    source,
    drawSessionId,
    created_at: iso(row, 'created_at'),
    updated_at: iso(row, 'updated_at'),
  };
}

export const toQuestionTemplateRow = (value: QuestionTemplate): Row => ({
  ...value,
  display_order: value.displayOrder,
  displayOrder: undefined,
});
