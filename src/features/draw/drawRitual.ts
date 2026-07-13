import type { DrawSession } from './drawTypes';

export type DrawRitualStage = NonNullable<DrawSession['configuration']['ritual']>['stage'];

export function ritualState(session: DrawSession) {
  return (
    session.configuration.ritual ?? {
      stage: 'prepare' as const,
      drawnCount: 0,
      revealedPositionIndexes: [],
    }
  );
}

function withRitual(session: DrawSession, ritual: ReturnType<typeof ritualState>): DrawSession {
  return { ...session, configuration: { ...session.configuration, ritual } };
}

export function startRitual(session: DrawSession): DrawSession {
  return withRitual(session, { ...ritualState(session), stage: 'draw' });
}

export function drawNextCard(session: DrawSession): DrawSession {
  const ritual = ritualState(session);
  const drawnCount = Math.min(session.cards.length, ritual.drawnCount + 1);
  return withRitual(session, {
    ...ritual,
    drawnCount,
    stage: drawnCount === session.cards.length ? 'reveal' : 'draw',
  });
}

export function revealCard(session: DrawSession, positionIndex: number): DrawSession {
  const ritual = ritualState(session);
  if (positionIndex >= ritual.drawnCount || ritual.revealedPositionIndexes.includes(positionIndex))
    return session;
  const revealedPositionIndexes = [...ritual.revealedPositionIndexes, positionIndex].sort(
    (a, b) => a - b,
  );
  return withRitual(session, {
    ...ritual,
    revealedPositionIndexes,
    stage: revealedPositionIndexes.length === session.cards.length ? 'reflection' : 'reveal',
  });
}

export function beginReveal(session: DrawSession): DrawSession {
  const ritual = ritualState(session);
  return ritual.drawnCount === session.cards.length
    ? withRitual(session, { ...ritual, stage: 'reveal' })
    : session;
}
