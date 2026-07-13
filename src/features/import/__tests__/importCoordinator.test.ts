import { describe, expect, it, vi } from 'vitest';
import type { ImportReadingCandidate } from '../importParser';
import { importReviewedReadings } from '../importCoordinator';
import type { ReadingRepository } from '../../readings/readingRepository';

const candidate = (importId: string, sourceOrder: number): ImportReadingCandidate => ({
  importId,
  sourceOrder,
  date: '2026-07-13',
  topicText: '关系',
  question: `Question ${importId}`,
  cards: [
    {
      tarotCardId: 1,
      rawCardName: '愚者',
      orientation: 'upright',
      reversalExpression: null,
      warnings: [],
    },
  ],
  notes: 'A note',
  warnings: [],
  isValid: true,
  excluded: false,
});

const repositoryFor = (createReading: ReturnType<typeof vi.fn>) =>
  ({ createReading }) as unknown as ReadingRepository;

const importCandidates = (
  candidates: ImportReadingCandidate[],
  repository: ReadingRepository,
  alreadySucceeded?: ReadonlySet<string>,
) =>
  importReviewedReadings({
    candidates,
    topicIds: new Map(candidates.map((item) => [item.importId, 'topic-1'])),
    topics: [],
    repository,
    timeZone: 'Africa/Nairobi',
    alreadySucceeded,
  });

describe('importReviewedReadings', () => {
  it('does not submit blocked or excluded candidates', async () => {
    const createReading = vi.fn();
    const blocked = { ...candidate('blocked', 1), date: null };
    const excluded = { ...candidate('excluded', 2), excluded: true };

    const result = await importCandidates([blocked, excluded], repositoryFor(createReading));

    expect(createReading).not.toHaveBeenCalled();
    expect(result.failed).toEqual([{ importId: 'blocked', error: 'Date is required.' }]);
    expect(result.skipped).toEqual([{ importId: 'excluded', error: 'skipped' }]);
  });

  it('retries only failures and never resubmits successful candidates', async () => {
    const createReading = vi
      .fn()
      .mockResolvedValueOnce({ id: 'reading-success' })
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ id: 'reading-retry' });
    const first = candidate('first', 1);
    const second = candidate('second', 2);
    const repository = repositoryFor(createReading);

    const initial = await importCandidates([first, second], repository);
    const retry = await importCandidates(
      [second],
      repository,
      new Set(initial.succeeded.map((item) => item.importId)),
    );

    expect(initial.succeeded).toEqual([{ importId: 'first', readingId: 'reading-success' }]);
    expect(initial.failed).toEqual([{ importId: 'second', error: 'temporary failure' }]);
    expect(retry.succeeded).toEqual([{ importId: 'second', readingId: 'reading-retry' }]);
    expect(createReading).toHaveBeenCalledTimes(3);
    expect(createReading.mock.calls.map(([input]) => input.temporary_question)).toEqual([
      'Question first',
      'Question second',
      'Question second',
    ]);
  });
});
