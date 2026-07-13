import type { FollowUpOutcome } from '../../domain/types';
import type { FollowUpDueState } from './followUpTypes';

export const outcomeLabels: Record<FollowUpOutcome, string> = {
  happened: '后来发生了相近情况',
  partly_happened: '部分相近',
  did_not_happen: '后来没有发生相近情况',
  still_unclear: '目前仍不明确',
};

export const dueStateLabels: Record<FollowUpDueState, string> = {
  overdue: '已到期',
  due_today: '今天回顾',
  upcoming: '即将回顾',
  completed: '已完成',
};
