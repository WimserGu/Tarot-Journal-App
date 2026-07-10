import type { TopicIcon } from '../../domain/types';

export const topicIconValues = [
  'book',
  'briefcase',
  'compass',
  'heart',
  'moon',
  'sparkles',
] as const satisfies readonly TopicIcon[];

export type TopicIconOption = {
  value: TopicIcon;
  label: string;
};

export const topicIconOptions: readonly TopicIconOption[] = [
  { value: 'book', label: '学习' },
  { value: 'briefcase', label: '事业' },
  { value: 'compass', label: '方向' },
  { value: 'heart', label: '关系' },
  { value: 'moon', label: '内在' },
  { value: 'sparkles', label: '灵感' },
];

export const questionFrequencyLabels = {
  as_needed: '按需',
  daily: '每日',
  weekly: '每周',
} as const;
