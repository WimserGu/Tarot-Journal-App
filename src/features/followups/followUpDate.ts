import type { ISODateTime, ReadingFollowUp } from '../../domain/types';
import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import type { FollowUpDueState } from './followUpTypes';

type DateParts = { year: number; month: number; day: number };
type DateTimeParts = DateParts & { hour: number; minute: number; second: number };

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
  } catch {
    throw new ValidationRepositoryError('Invalid IANA timezone.', 'followUpDate');
  }
}

function partsAt(value: string | number, timezone: string): DateTimeParts {
  assertTimezone(timezone);
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp))
    throw new ValidationRepositoryError('Invalid follow-up date.', 'followUpDate');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timestamp);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function addDays(parts: DateParts, days: number): DateParts {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
}

function zonedDateTime(parts: DateTimeParts, timezone: string): ISODateTime {
  const target = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let candidate = target;
  for (let index = 0; index < 5; index += 1) {
    const observed = partsAt(candidate, timezone);
    const observedValue = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    candidate += target - observedValue;
  }
  return new Date(candidate).toISOString();
}

function dateKey(value: string | number, timezone: string): string {
  const parts = partsAt(value, timezone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function addFollowUpCalendarDays(
  readingAt: ISODateTime,
  timezone: string,
  days: 7 | 30,
): ISODateTime {
  const original = partsAt(readingAt, timezone);
  return zonedDateTime(
    {
      ...addDays(original, days),
      hour: original.hour,
      minute: original.minute,
      second: original.second,
    },
    timezone,
  );
}

export function customFollowUpDate(
  date: string,
  readingAt: ISODateTime,
  timezone: string,
): ISODateTime {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new ValidationRepositoryError('Choose a valid follow-up date.', 'followUpDate');
  const readingParts = partsAt(readingAt, timezone);
  const scheduledFor = zonedDateTime(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: readingParts.hour,
      minute: readingParts.minute,
      second: readingParts.second,
    },
    timezone,
  );
  if (dateKey(scheduledFor, timezone) !== date)
    throw new ValidationRepositoryError('Choose a valid follow-up date.', 'followUpDate');
  if (dateKey(scheduledFor, timezone) < dateKey(readingAt, timezone))
    throw new ValidationRepositoryError(
      'The follow-up date cannot be before the Reading date.',
      'followUpDate',
    );
  return scheduledFor;
}

export function getFollowUpDueState(
  followUp: Pick<ReadingFollowUp, 'reviewedAt' | 'scheduledFor'>,
  now: string | number,
  timezone: string,
): FollowUpDueState {
  if (followUp.reviewedAt !== null) return 'completed';
  const scheduled = dateKey(followUp.scheduledFor, timezone);
  const today = dateKey(now, timezone);
  if (scheduled === today) return 'due_today';
  return scheduled < today ? 'overdue' : 'upcoming';
}

export function formatFollowUpDate(value: ISODateTime, timezone: string): string {
  assertTimezone(timezone);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function followUpDateInputValue(value: ISODateTime, timezone: string): string {
  return dateKey(value, timezone);
}
