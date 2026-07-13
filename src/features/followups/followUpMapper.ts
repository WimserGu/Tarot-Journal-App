import type { FollowUpOutcome, FollowUpStatus, ReadingFollowUp } from '../../domain/types';
import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import type { CreateFollowUpInput, UpdateFollowUpInput } from './followUpTypes';

type Row = Record<string, unknown>;
const statusValues: FollowUpStatus[] = ['scheduled', 'completed'];
const outcomeValues: FollowUpOutcome[] = [
  'happened',
  'partly_happened',
  'did_not_happen',
  'still_unclear',
];

function fail(field: string): never {
  throw new ValidationRepositoryError(`Invalid database value for ${field}.`, 'mapFollowUp');
}
const string = (row: Row, key: string) => (typeof row[key] === 'string' ? row[key] : fail(key));
const iso = (row: Row, key: string) => {
  const value = string(row, key);
  return Number.isNaN(Date.parse(value)) ? fail(key) : value;
};
const nullableString = (row: Row, key: string) => (row[key] === null ? null : string(row, key));
function enumValue<T extends string>(row: Row, key: string, values: readonly T[]): T {
  const value = string(row, key);
  return values.includes(value as T) ? (value as T) : fail(key);
}

export function mapFollowUpRow(row: Row): ReadingFollowUp {
  const status = enumValue(row, 'status', statusValues);
  const outcome = row.outcome === null ? null : enumValue(row, 'outcome', outcomeValues);
  const reviewedAt = row.reviewed_at === null ? null : iso(row, 'reviewed_at');
  if (status === 'scheduled' && (reviewedAt !== null || outcome !== null)) fail('status');
  if (status === 'completed' && (reviewedAt === null || outcome === null)) fail('status');
  string(row, 'user_id');
  return {
    id: string(row, 'id'),
    readingId: string(row, 'reading_id'),
    scheduledFor: iso(row, 'scheduled_for'),
    reviewedAt,
    status,
    outcome,
    reflection: nullableString(row, 'reflection'),
    createdAt: iso(row, 'created_at'),
    updatedAt: iso(row, 'updated_at'),
  };
}

export const toFollowUpInsertRow = (input: CreateFollowUpInput): Row => ({
  reading_id: input.readingId,
  scheduled_for: input.scheduledFor,
  reviewed_at: null,
  status: 'scheduled',
  outcome: null,
  reflection: null,
});

export const toFollowUpUpdateRow = (input: UpdateFollowUpInput): Row => ({
  ...(input.scheduledFor === undefined ? {} : { scheduled_for: input.scheduledFor }),
  ...(input.outcome === undefined ? {} : { outcome: input.outcome }),
  ...(input.reflection === undefined ? {} : { reflection: input.reflection }),
});
