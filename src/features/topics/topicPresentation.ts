import type { CardOrientation, ISODateTime } from '@/domain/types';

export function getCurrentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function formatTopicDate(value: ISODateTime, timeZone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function orientationLabel(orientation: CardOrientation): string {
  return orientation === 'upright' ? '正位' : '逆位';
}
