import type { FollowUpOutcome, ReadingFollowUp } from '../../domain/types';
import type { OutcomeDistribution } from './followUpTypes';

const outcomes: FollowUpOutcome[] = [
  'happened',
  'partly_happened',
  'did_not_happen',
  'still_unclear',
];

export function calculateOutcomeDistribution(
  followUps: readonly ReadingFollowUp[],
): OutcomeDistribution {
  const completed = followUps.filter(
    (followUp): followUp is ReadingFollowUp & { outcome: FollowUpOutcome } =>
      followUp.status === 'completed' && followUp.outcome !== null,
  );
  return {
    completedCount: completed.length,
    items: Object.fromEntries(
      outcomes.map((outcome) => {
        const matches = completed.filter((followUp) => followUp.outcome === outcome);
        return [
          outcome,
          {
            outcome,
            count: matches.length,
            ratio: completed.length === 0 ? 0 : matches.length / completed.length,
            followUpIds: matches.map((followUp) => followUp.id),
            readingIds: [...new Set(matches.map((followUp) => followUp.readingId))],
          },
        ];
      }),
    ) as OutcomeDistribution['items'],
  };
}
