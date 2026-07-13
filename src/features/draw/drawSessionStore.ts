import type { ReadingCardFormValue } from '../readings/readingSchema';
import type { DrawResult, DrawSession } from './drawTypes';

let sequence = 0;
let activeSession: DrawSession | null = null;

function runtimeId(now: Date): string {
  sequence += 1;
  const timestamp = now.getTime().toString(16).padStart(12, '0').slice(-12);
  const counter = sequence.toString(16).padStart(12, '0').slice(-12);

  // The session itself is transient, but this identifier is persisted on drawn cards.
  // Keep it compatible with the database UUID column without a platform random dependency.
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8)}-4${counter.slice(-3)}-8${counter.slice(
    -3,
  )}-${counter}`;
}

export function createDrawSession(result: DrawResult): DrawSession {
  const createdAt = new Date(result.createdAt);
  const id = runtimeId(createdAt);
  return {
    id,
    createdAt: result.createdAt,
    configuration: { ...result.configuration },
    cards: result.cards.map((card) => ({ ...card, drawSessionId: id })),
    linkedReadingId: null,
  };
}

export function setActiveDrawSession(session: DrawSession | null): void {
  activeSession = session;
}

export function getActiveDrawSession(id?: string): DrawSession | null {
  return activeSession && (!id || activeSession.id === id) ? activeSession : null;
}

export function linkActiveDrawSession(readingId: string): void {
  if (activeSession) activeSession = { ...activeSession, linkedReadingId: readingId };
}

export function drawSessionCardsToForm(session: DrawSession): ReadingCardFormValue[] {
  return session.cards.map((card) => ({
    tarot_card_id: card.tarotCardId,
    position_name: '',
    orientation: card.orientation,
    reversalExpression: card.reversalExpression,
    source: card.source,
    drawSessionId: card.drawSessionId,
  }));
}
