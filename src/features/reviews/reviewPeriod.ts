import { ValidationRepositoryError } from '../../repositories/repositoryErrors';
import type { ReviewPeriod, ReviewType } from './reviewTypes';

type DateParts = { year: number; month: number; day: number };
type DateTimeParts = DateParts & { hour: number; minute: number; second: number };

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
  } catch {
    throw new ValidationRepositoryError('Invalid IANA timezone.', 'reviewPeriod');
  }
}

function partsAt(value: string | number, timezone: string): DateTimeParts {
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp))
    throw new ValidationRepositoryError('Invalid review date.', 'reviewPeriod');
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
  const get = (type: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') =>
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

function addCalendarDays(parts: DateParts, days: number): DateParts {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
}

function firstOfMonth(parts: DateParts, offset: number): DateParts {
  const value = new Date(Date.UTC(parts.year, parts.month - 1 + offset, 1));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: 1 };
}

function zonedMidnight(parts: DateParts, timezone: string): string {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day);
  let candidate = target;
  for (let index = 0; index < 4; index += 1) {
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

export function getReviewPeriod(
  reviewType: ReviewType,
  anchor: string | number,
  timezone: string,
  now: string | number,
): ReviewPeriod {
  assertTimezone(timezone);
  const anchorParts = partsAt(anchor, timezone);
  let startParts: DateParts;
  let endParts: DateParts;
  let previousStartParts: DateParts;
  if (reviewType === 'weekly') {
    const weekday = new Date(
      Date.UTC(anchorParts.year, anchorParts.month - 1, anchorParts.day),
    ).getUTCDay();
    startParts = addCalendarDays(anchorParts, -((weekday + 6) % 7));
    endParts = addCalendarDays(startParts, 7);
    previousStartParts = addCalendarDays(startParts, -7);
  } else if (reviewType === 'monthly') {
    startParts = firstOfMonth(anchorParts, 0);
    endParts = firstOfMonth(anchorParts, 1);
    previousStartParts = firstOfMonth(anchorParts, -1);
  } else {
    throw new ValidationRepositoryError('Invalid review type.', 'reviewPeriod');
  }
  const periodStart = zonedMidnight(startParts, timezone);
  const periodEnd = zonedMidnight(endParts, timezone);
  const previousPeriodStart = zonedMidnight(previousStartParts, timezone);
  const nowValue = typeof now === 'number' ? now : Date.parse(now);
  if (!Number.isFinite(nowValue))
    throw new ValidationRepositoryError('Invalid current date.', 'reviewPeriod');
  if (Date.parse(periodStart) > nowValue)
    throw new ValidationRepositoryError('Future review periods are not available.', 'reviewPeriod');
  return {
    reviewType,
    periodStart,
    periodEnd,
    previousPeriodStart,
    previousPeriodEnd: periodStart,
    timezone,
    isInProgress: nowValue >= Date.parse(periodStart) && nowValue < Date.parse(periodEnd),
  };
}

export function shiftReviewPeriod(
  period: ReviewPeriod,
  direction: -1 | 1,
  now: string | number,
): ReviewPeriod {
  const anchor =
    period.reviewType === 'weekly'
      ? Date.parse(period.periodStart) + direction * 7 * 86_400_000 + 12 * 3_600_000
      : Date.parse(period.periodStart) + (direction > 0 ? 35 : -15) * 86_400_000;
  return getReviewPeriod(period.reviewType, anchor, period.timezone, now);
}

export function reviewPeriodAnchorDate(period: ReviewPeriod): string {
  const parts = partsAt(period.periodStart, period.timezone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}
