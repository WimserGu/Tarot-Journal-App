import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  QuestionTemplate,
  QuestionTemplatePosition,
  QuestionTag,
  Reading,
  ReadingCard,
  ReadingFollowUp,
  Topic,
} from '../domain/types';
import { decodeStoredReversalVariant } from './reversalStorage';
import type { DrawSession } from '../features/draw/drawTypes';

import type { JournalData, MutableJournalData } from './journalData';

export const JOURNAL_SCHEMA_VERSION = 8;

const storagePrefix = '@tarot-journal/v1';
const schemaKey = `${storagePrefix}/schema`;
const corruptPrefix = `${storagePrefix}/corrupt`;

type PersistedTable = Exclude<keyof JournalData, 'tarot_cards'>;

const tableKeys: Record<PersistedTable, string> = {
  topics: `${storagePrefix}/topics`,
  question_templates: `${storagePrefix}/question_templates`,
  question_template_positions: `${storagePrefix}/question_template_positions`,
  question_tags: `${storagePrefix}/question_tags`,
  readings: `${storagePrefix}/readings`,
  reading_cards: `${storagePrefix}/reading_cards`,
  reading_follow_ups: `${storagePrefix}/reading_follow_ups`,
  draw_sessions: `${storagePrefix}/draw_sessions`,
};

export const journalStorageKeys = {
  schema: schemaKey,
  tables: tableKeys,
};

export interface JournalKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export class JournalStorageError extends Error {
  constructor(
    readonly code:
      'corrupt_data' | 'migration_failed' | 'storage_unavailable' | 'unsupported_schema',
    message: string,
  ) {
    super(message);
    this.name = 'JournalStorageError';
  }
}

export type JournalRecoveryNotice = {
  key: string;
  message: string;
};

export type JournalLoadResult = {
  data: MutableJournalData;
  recovery_notices: JournalRecoveryNotice[];
};

export const asyncStorageAdapter: JournalKeyValueStorage = AsyncStorage;

function cloneSeed(data: JournalData): MutableJournalData {
  return {
    topics: [...data.topics],
    question_templates: [...data.question_templates],
    question_template_positions: [...data.question_template_positions],
    question_tags: [...(data.question_tags ?? [])],
    readings: [...data.readings],
    reading_cards: [...data.reading_cards],
    reading_follow_ups: [...data.reading_follow_ups],
    draw_sessions: [...(data.draw_sessions ?? [])],
    tarot_cards: [...data.tarot_cards],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function persistedReversalVariant(value: Record<string, unknown>): unknown {
  return Object.prototype.hasOwnProperty.call(value, 'reversalVariant')
    ? value.reversalVariant
    : value.reversalExpression;
}

function hasIdentity(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.id === 'string' && typeof value.user_id === 'string';
}

function validTopic(value: unknown): value is Topic {
  return (
    hasIdentity(value) && typeof value.title === 'string' && typeof value.created_at === 'string'
  );
}

function validQuestionTemplate(value: unknown): value is QuestionTemplate {
  return (
    hasIdentity(value) &&
    typeof value.topic_id === 'string' &&
    typeof value.question_text === 'string' &&
    typeof value.created_at === 'string'
  );
}

function validQuestionPosition(value: unknown): value is QuestionTemplatePosition {
  return (
    hasIdentity(value) &&
    typeof value.question_template_id === 'string' &&
    typeof value.position_order === 'number' &&
    typeof value.position_name === 'string'
  );
}

function validQuestionTag(value: unknown): value is QuestionTag {
  return (
    hasIdentity(value) &&
    typeof value.topic_id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.normalized_name === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

function validReading(value: unknown): value is Reading {
  return (
    hasIdentity(value) &&
    typeof value.reading_at === 'string' &&
    typeof value.status === 'string' &&
    (value.spread_id === undefined ||
      value.spread_id === null ||
      typeof value.spread_id === 'string')
  );
}

function validReadingCard(value: unknown): value is ReadingCard {
  if (!(
    hasIdentity(value) &&
    typeof value.reading_id === 'string' &&
    typeof value.position_order === 'number' &&
    typeof value.orientation === 'string'
  ))
    return false;
  const source = value.source;
  const legacyValue = value as Record<string, unknown>;
  const rawVariant = persistedReversalVariant(legacyValue);
  const variant = decodeStoredReversalVariant(rawVariant);
  const drawSessionId = value.drawSessionId;
  const spreadPositionId = value.spreadPositionId;
  const sourceValid = source === undefined || source === 'drawn' || source === 'manual';
  const variantValid = rawVariant === undefined || variant !== undefined;
  const drawSessionValid =
    drawSessionId === undefined || drawSessionId === null || typeof drawSessionId === 'string';
  const spreadPositionValid =
    spreadPositionId === undefined ||
    spreadPositionId === null ||
    typeof spreadPositionId === 'string';
  const interpretationValid =
    value.interpretation === undefined ||
    value.interpretation === null ||
    (typeof value.interpretation === 'string' && value.interpretation.length <= 5000);
  const stateValid = value.orientation !== 'upright' || variant === undefined || variant === null;
  const sourceLinkValid =
    source === undefined ||
    (source === 'manual' && (drawSessionId === undefined || drawSessionId === null)) ||
    (source === 'drawn' && typeof drawSessionId === 'string');
  return (
    sourceValid &&
    variantValid &&
    drawSessionValid &&
    spreadPositionValid &&
    interpretationValid &&
    stateValid &&
    sourceLinkValid
  );
}

function validReadingFollowUp(value: unknown): value is ReadingFollowUp {
  if (!(
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.readingId === 'string' &&
    typeof value.scheduledFor === 'string' &&
    (value.reviewedAt === null || typeof value.reviewedAt === 'string') &&
    typeof value.status === 'string' &&
    (value.outcome === null || typeof value.outcome === 'string') &&
    (value.reflection === null || typeof value.reflection === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  ))
    return false;
  const validStatus = value.status === 'scheduled' || value.status === 'completed';
  const validOutcome =
    value.outcome === null ||
    value.outcome === 'happened' ||
    value.outcome === 'partly_happened' ||
    value.outcome === 'did_not_happen' ||
    value.outcome === 'still_unclear';
  const validState =
    (value.status === 'scheduled' && value.reviewedAt === null && value.outcome === null) ||
    (value.status === 'completed' && value.reviewedAt !== null && value.outcome !== null);
  return (
    validStatus &&
    validOutcome &&
    validState &&
    !Number.isNaN(Date.parse(value.scheduledFor)) &&
    (value.reviewedAt === null || !Number.isNaN(Date.parse(value.reviewedAt))) &&
    (value.reflection === null || value.reflection.length <= 5000)
  );
}

function validDrawSession(value: unknown): value is DrawSession {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.userId !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    (value.spreadId !== null && typeof value.spreadId !== 'string') ||
    !isRecord(value.configuration) ||
    !Array.isArray(value.cards) ||
    !['draft', 'saved', 'discarded'].includes(String(value.status)) ||
    (value.linkedReadingId !== null && typeof value.linkedReadingId !== 'string')
  )
    return false;
  return value.cards.every(
    (card) =>
      isRecord(card) &&
      typeof card.id === 'string' &&
      typeof card.tarotCardId === 'number' &&
      Number.isInteger(card.positionIndex) &&
      typeof card.spreadPositionId === 'string' &&
      (card.orientation === 'upright' || card.orientation === 'reversed') &&
      (() => {
        const legacyCard = card as Record<string, unknown>;
        const rawVariant = persistedReversalVariant(legacyCard);
        return rawVariant === undefined || decodeStoredReversalVariant(rawVariant) !== undefined;
      })() &&
      card.source === 'drawn' &&
      typeof card.drawSessionId === 'string',
  );
}

const validators: {
  [Key in PersistedTable]: (value: unknown) => value is MutableJournalData[Key][number];
} = {
  topics: validTopic,
  question_templates: validQuestionTemplate,
  question_template_positions: validQuestionPosition,
  question_tags: validQuestionTag,
  readings: validReading,
  reading_cards: validReadingCard,
  reading_follow_ups: validReadingFollowUp,
  draw_sessions: validDrawSession,
};

export class JournalPersistence {
  constructor(private readonly storage: JournalKeyValueStorage) {}

  async load(seed: JournalData): Promise<JournalLoadResult> {
    const data = cloneSeed(seed);
    const recoveryNotices: JournalRecoveryNotice[] = [];
    const schemaVersion = await this.readSchemaVersion();

    if (schemaVersion > JOURNAL_SCHEMA_VERSION) {
      throw new JournalStorageError('unsupported_schema', '本地数据版本高于当前 App 版本。');
    }

    for (const table of Object.keys(tableKeys) as PersistedTable[]) {
      const raw = await this.storage.getItem(tableKeys[table]);

      if (raw === null) {
        continue;
      }

      try {
        const parsed: unknown = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
          throw new JournalStorageError('corrupt_data', '本地数据表不是数组。');
        }

        const validRecords = parsed.filter(validators[table]);

        if (validRecords.length !== parsed.length) {
          await this.quarantine(table, raw);
          recoveryNotices.push({ key: table, message: '已跳过损坏的本地记录。' });
        }

        data[table] = validRecords;
      } catch (error) {
        await this.quarantine(table, raw);
        recoveryNotices.push({
          key: table,
          message: error instanceof Error ? error.message : '无法解析本地数据。',
        });
      }
    }

    this.normalizeReadingCards(data);

    if (schemaVersion < JOURNAL_SCHEMA_VERSION) {
      this.migrateData(data);
      await this.migrate(schemaVersion);
    }

    return { data, recovery_notices: recoveryNotices };
  }

  async save(data: JournalData): Promise<void> {
    try {
      for (const table of Object.keys(tableKeys) as PersistedTable[]) {
        await this.storage.setItem(tableKeys[table], JSON.stringify(data[table] ?? []));
      }
      await this.storage.setItem(schemaKey, JSON.stringify({ version: JOURNAL_SCHEMA_VERSION }));
    } catch (error) {
      throw new JournalStorageError(
        'storage_unavailable',
        error instanceof Error ? error.message : '无法写入本地数据。',
      );
    }
  }

  async clear(): Promise<void> {
    for (const table of Object.keys(tableKeys) as PersistedTable[]) {
      await this.storage.removeItem(tableKeys[table]);
    }
    await this.storage.removeItem(schemaKey);
  }

  private async readSchemaVersion(): Promise<number> {
    const raw = await this.storage.getItem(schemaKey);

    if (raw === null) {
      return 0;
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      return isRecord(parsed) && typeof parsed.version === 'number' ? parsed.version : 0;
    } catch {
      return 0;
    }
  }

  private async migrate(fromVersion: number): Promise<void> {
    if (fromVersion < 0 || fromVersion > JOURNAL_SCHEMA_VERSION) {
      throw new JournalStorageError('migration_failed', '没有可用的本地数据迁移路径。');
    }

    await this.storage.setItem(schemaKey, JSON.stringify({ version: JOURNAL_SCHEMA_VERSION }));
  }

  private migrateData(data: MutableJournalData): void {
    const byTopic = new Map<string, QuestionTemplate[]>();
    data.question_templates.forEach((template) => {
      const group = byTopic.get(template.topic_id) ?? [];
      group.push(template);
      byTopic.set(template.topic_id, group);
    });
    byTopic.forEach((templates) => {
      templates
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
        .forEach((template, index) => {
          template.displayOrder = index + 1;
        });
    });
  }

  private normalizeReadingCards(data: MutableJournalData): void {
    data.readings.forEach((reading) => {
      reading.spread_id ??= null;
      reading.question_tag_id ??= null;
    });
    data.reading_cards.forEach((card) => {
      const legacyCard = card as ReadingCard & { reversalExpression?: unknown };
      card.source ??= 'manual';
      card.reversalVariant =
        decodeStoredReversalVariant(persistedReversalVariant(legacyCard)) ?? null;
      delete legacyCard.reversalExpression;
      card.drawSessionId ??= null;
      card.spreadPositionId ??= null;
      card.interpretation ??= null;
    });
    data.draw_sessions.forEach((session) => {
      const legacyConfiguration = session.configuration as typeof session.configuration & {
        overexpressedProbabilityWhenReversed?: number;
        reversalMode: typeof session.configuration.reversalMode | 'expression';
      };
      if ((legacyConfiguration.reversalMode as string) === 'expression')
        session.configuration.reversalMode = 'dual';
      session.configuration.rightProbabilityWhenReversed ??=
        legacyConfiguration.overexpressedProbabilityWhenReversed ?? 0.5;
      delete legacyConfiguration.overexpressedProbabilityWhenReversed;
      session.cards.forEach((card) => {
        const legacyCard = card as typeof card & { reversalExpression?: unknown };
        card.reversalVariant =
          decodeStoredReversalVariant(persistedReversalVariant(legacyCard)) ?? null;
        delete legacyCard.reversalExpression;
      });
    });
  }

  private async quarantine(table: PersistedTable, raw: string): Promise<void> {
    const key = `${corruptPrefix}/${table}/${Date.now()}`;

    try {
      await this.storage.setItem(key, raw);
    } catch {
      // Recovery still uses the valid records that could be parsed.
    }
  }
}
