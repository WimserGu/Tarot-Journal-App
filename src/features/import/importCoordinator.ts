import type { ReadingRepository } from '../readings/readingRepository';
import type { ImportReadingCandidate } from './importParser';
import type { Topic } from '../../domain/types';
export type ImportItemResult = { importId: string; readingId?: string; error?: string };
export type BatchImportResult = {
  succeeded: ImportItemResult[];
  failed: ImportItemResult[];
  skipped: ImportItemResult[];
};
let active = false;
function valid(candidate: ImportReadingCandidate, topicId?: string): string | null {
  if (candidate.excluded) return 'skipped';
  if (!candidate.question.trim()) return 'Question is required.';
  if (!candidate.date) return 'Date is required.';
  if (!topicId) return 'Topic selection is required.';
  if (
    !candidate.cards.length ||
    candidate.cards.some(
      (card) =>
        card.tarotCardId === null ||
        card.orientation === null ||
        (card.orientation === 'upright' && card.reversalExpression),
    )
  )
    return 'Cards need correction.';
  return null;
}
export async function importReviewedReadings(args: {
  candidates: readonly ImportReadingCandidate[];
  topicIds: ReadonlyMap<string, string>;
  topics: readonly Topic[];
  repository: ReadingRepository;
  timeZone: string;
  alreadySucceeded?: ReadonlySet<string>;
}): Promise<BatchImportResult> {
  if (active)
    return {
      succeeded: [],
      failed: [{ importId: 'batch', error: 'Import already in progress.' }],
      skipped: [],
    };
  active = true;
  try {
    const result: BatchImportResult = { succeeded: [], failed: [], skipped: [] };
    for (const candidate of [...args.candidates].sort((a, b) => a.sourceOrder - b.sourceOrder)) {
      if (args.alreadySucceeded?.has(candidate.importId)) {
        result.skipped.push({ importId: candidate.importId, error: 'Already imported.' });
        continue;
      }
      const topicId = args.topicIds.get(candidate.importId);
      const reason = valid(candidate, topicId);
      if (reason) {
        (reason === 'skipped' ? result.skipped : result.failed).push({
          importId: candidate.importId,
          error: reason,
        });
        continue;
      }
      try {
        const reading = await args.repository.createReading({
          topic_id: topicId!,
          question_template_id: null,
          temporary_question: candidate.question,
          spread_id: null,
          reading_at: `${candidate.date}T12:00:00.000Z`,
          reading_timezone: args.timeZone,
          interpretation: candidate.notes,
          status: 'completed',
          cards: candidate.cards.map((card, index) => ({
            tarot_card_id: card.tarotCardId,
            position_name: null,
            position_order: index + 1,
            orientation: card.orientation!,
            reversalExpression: card.reversalExpression,
            source: 'manual',
            drawSessionId: null,
            spreadPositionId: null,
          })),
        });
        result.succeeded.push({ importId: candidate.importId, readingId: reading.id });
      } catch (error) {
        result.failed.push({
          importId: candidate.importId,
          error: error instanceof Error ? error.message : 'Import failed.',
        });
      }
    }
    return result;
  } finally {
    active = false;
  }
}
