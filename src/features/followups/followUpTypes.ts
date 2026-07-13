import type {
  FollowUpOutcome,
  FollowUpStatus,
  ISODateTime,
  ReadingFollowUp,
  UUID,
} from '../../domain/types';
import type { ReadingDetail } from '../readings/readingRepository';

export type FollowUpDueState = 'upcoming' | 'due_today' | 'overdue' | 'completed';

export type FollowUpPendingFilter = {
  limit?: number;
  now?: ISODateTime;
  timezone?: string;
};

export type FollowUpListFilter = {
  status?: FollowUpStatus;
};

export type ReadingFollowUpListItem = {
  followUp: ReadingFollowUp;
  questionText: string;
  readingAt: ISODateTime;
  readingTimezone: string;
  dueState: FollowUpDueState;
};

export type ReadingFollowUpDetail = {
  followUp: ReadingFollowUp;
  reading: ReadingDetail;
};

export type CreateFollowUpInput = {
  readingId: UUID;
  scheduledFor: ISODateTime;
};

export type UpdateFollowUpInput = {
  scheduledFor?: ISODateTime;
  outcome?: FollowUpOutcome;
  reflection?: string | null;
};

export type CompleteFollowUpInput = {
  outcome: FollowUpOutcome;
  reflection: string | null;
  reviewedAt: ISODateTime;
};

export type OutcomeDistributionItem = {
  outcome: FollowUpOutcome;
  count: number;
  ratio: number;
  followUpIds: UUID[];
  readingIds: UUID[];
};

export type OutcomeDistribution = {
  completedCount: number;
  items: Record<FollowUpOutcome, OutcomeDistributionItem>;
};
