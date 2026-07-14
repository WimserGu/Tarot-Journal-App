import type {
  CardOrientation,
  CardEntrySource,
  QuestionFrequency,
  QuestionTemplate,
  QuestionTemplatePosition,
  Reading,
  ReadingCard,
  ReadingStatus,
  Topic,
  TopicIcon,
} from '../domain/types';
import type { DrawSession, DrawnCard, DrawConfiguration } from '../features/draw/drawTypes';
import { ValidationRepositoryError } from './repositoryErrors';
import { decodeStoredReversalVariant } from './reversalStorage';

type Row = Record<string, unknown>;

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  const decodedReversalVariant = decodeStoredReversalVariant(row.reversal_expression);
  if (decodedReversalVariant === undefined && row.reversal_expression !== undefined)
    fail('reversal_expression');
  const reversalVariant = decodedReversalVariant ?? null;
  const orientation = enumValue<CardOrientation>(row, 'orientation', ['upright', 'reversed']);
  if (orientation === 'upright' && reversalVariant !== null) fail('reversal_expression');
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
    reversalVariant,
    source,
    drawSessionId,
    created_at: iso(row, 'created_at'),
    updated_at: iso(row, 'updated_at'),
  };
}

function drawConfiguration(value: unknown): DrawConfiguration {
  if (!isRecord(value) || !Array.isArray(value.spread_position_ids)) fail('configuration');
  const cardCount = value.card_count;
  const reversalMode = value.reversal_mode === 'expression' ? 'dual' : value.reversal_mode;
  const reversedProbability = value.reversed_probability;
  const rightProbability =
    value.right_probability_when_reversed ?? value.overexpressed_probability_when_reversed;
  const ritual = value.ritual;
  const table = value.table;
  if (
    typeof cardCount !== 'number' ||
    !Number.isInteger(cardCount) ||
    typeof value.spread_id !== 'string' ||
    !['disabled', 'standard', 'dual'].includes(String(reversalMode)) ||
    typeof reversedProbability !== 'number' ||
    typeof rightProbability !== 'number' ||
    !value.spread_position_ids.every((id) => typeof id === 'string')
  )
    fail('configuration');
  const configuration: DrawConfiguration = {
    cardCount,
    spreadId: value.spread_id,
    spreadPositionIds: value.spread_position_ids as string[],
    reversalMode: reversalMode as DrawConfiguration['reversalMode'],
    reversedProbability,
    rightProbabilityWhenReversed: rightProbability,
  };
  if (typeof value.question_text === 'string') configuration.questionText = value.question_text;
  if (
    Array.isArray(value.hidden_deck_card_ids) &&
    value.hidden_deck_card_ids.every(Number.isInteger)
  )
    configuration.hiddenDeckCardIds = value.hidden_deck_card_ids as number[];
  if (ritual !== null && ritual !== undefined) {
    if (
      !isRecord(ritual) ||
      !['prepare', 'draw', 'reveal', 'reflection'].includes(String(ritual.stage)) ||
      !Number.isInteger(ritual.drawn_count) ||
      !Array.isArray(ritual.revealed_position_indexes) ||
      !ritual.revealed_position_indexes.every((index) => Number.isInteger(index))
    )
      fail('configuration.ritual');
    configuration.ritual = {
      stage: ritual.stage as NonNullable<DrawConfiguration['ritual']>['stage'],
      drawnCount: ritual.drawn_count as number,
      revealedPositionIndexes: ritual.revealed_position_indexes as number[],
      isObserving: ritual.is_observing === true,
      cardNotes: isRecord(ritual.card_notes)
        ? Object.fromEntries(
            Object.entries(ritual.card_notes)
              .filter(([, note]) => typeof note === 'string')
              .map(([key, note]) => [key, note as string]),
          )
        : {},
    };
  }
  if (isRecord(table) && isRecord(table.placements_by_card_id)) {
    configuration.table = {
      placementsByCardId: Object.fromEntries(
        Object.entries(table.placements_by_card_id).flatMap(([cardId, placement]) => {
          if (
            !isRecord(placement) ||
            typeof placement.x !== 'number' ||
            typeof placement.y !== 'number' ||
            !Number.isInteger(placement.z_index)
          )
            return [];
          return [
            [
              cardId,
              {
                x: Math.max(0, Math.min(1, placement.x)),
                y: Math.max(0, Math.min(1, placement.y)),
                zIndex: Math.max(1, Math.min(1000, placement.z_index as number)),
              },
            ],
          ];
        }),
      ),
    };
  }
  return configuration;
}

export function mapDrawSessionRow(row: Row): DrawSession {
  return {
    id: string(row, 'id'),
    userId: string(row, 'user_id'),
    createdAt: iso(row, 'created_at'),
    updatedAt: iso(row, 'updated_at'),
    spreadId: nullableString(row, 'spread_id'),
    configuration: drawConfiguration(row.configuration),
    status: enumValue(row, 'status', ['draft', 'saved', 'discarded']),
    linkedReadingId: nullableString(row, 'linked_reading_id'),
    cards: [],
  };
}

export function mapDrawSessionCardRow(row: Row): DrawnCard {
  const orientation = enumValue<CardOrientation>(row, 'orientation', ['upright', 'reversed']);
  const decodedReversalVariant = decodeStoredReversalVariant(row.reversal_expression);
  if (decodedReversalVariant === undefined && row.reversal_expression !== undefined)
    fail('reversal_expression');
  const reversalVariant = decodedReversalVariant ?? null;
  if (orientation === 'upright' && reversalVariant !== null) fail('reversal_expression');
  return {
    id: string(row, 'id'),
    tarotCardId: integer(row, 'tarot_card_id'),
    positionIndex: integer(row, 'position_index'),
    spreadPositionId: string(row, 'spread_position_id'),
    positionSnapshot: string(row, 'position_snapshot'),
    orientation,
    reversalVariant,
    source: enumValue<CardEntrySource>(row, 'source', ['drawn', 'manual']),
    drawSessionId: string(row, 'draw_session_id'),
  };
}

export const toQuestionTemplateRow = (value: QuestionTemplate): Row => ({
  ...value,
  display_order: value.displayOrder,
  displayOrder: undefined,
});
