import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_USER_ID } from '../../../domain/mockData';
import {
  ConflictRepositoryError,
  NotFoundRepositoryError,
  ValidationRepositoryError,
} from '../../../repositories/repositoryErrors';
import { MockJournalStore, journalSeedData } from '../../../repositories/mockJournalStore';
import { MockReadingRepository } from '../../readings/mockReadingRepository';
import { LocalFollowUpRepository } from '../followUpRepository';

const now = '2026-07-13T10:00:00.000Z';

describe('Local FollowUpRepository contract', () => {
  let store: MockJournalStore;
  let repository: LocalFollowUpRepository;
  let readings: MockReadingRepository;
  let readingId: string;
  beforeEach(() => {
    let id = 0;
    store = new MockJournalStore(journalSeedData, {
      user_id: DEMO_USER_ID,
      now: () => now,
      create_id: (kind) => `${kind}-${++id}`,
    });
    repository = new LocalFollowUpRepository(store, () => 'UTC');
    readings = new MockReadingRepository(store);
    readingId = journalSeedData.readings[0]!.id;
  });

  it('creates multiple scheduled Follow-Ups and sorts the Reading timeline', async () => {
    const first = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    const second = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-08-20T10:00:00.000Z',
    });
    expect(first.status).toBe('scheduled');
    expect((await repository.listForReading(readingId)).map((item) => item.id)).toEqual([
      second.id,
      first.id,
    ]);
  });
  it('returns pending items in overdue, today, upcoming stable order', async () => {
    await repository.createFollowUp({ readingId, scheduledFor: '2026-07-14T10:00:00.000Z' });
    await repository.createFollowUp({ readingId, scheduledFor: '2026-07-12T10:00:00.000Z' });
    await repository.createFollowUp({ readingId, scheduledFor: '2026-07-13T20:00:00.000Z' });
    expect(
      (await repository.listPending({ now, timezone: 'UTC' })).map((item) => item.dueState),
    ).toEqual(['overdue', 'due_today', 'upcoming']);
  });
  it('gets detail, updates, completes and edits a completed reflection', async () => {
    const created = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    await repository.updateFollowUp(created.id, { scheduledFor: '2026-07-21T10:00:00.000Z' });
    await repository.completeFollowUp(created.id, {
      outcome: 'still_unclear',
      reflection: null,
      reviewedAt: now,
    });
    const updated = await repository.updateFollowUp(created.id, {
      outcome: 'partly_happened',
      reflection: 'line 1\nline 2',
    });
    expect(updated.reflection).toBe('line 1\nline 2');
    expect((await repository.getFollowUp(created.id))?.reading.reading.id).toBe(readingId);
  });
  it('snoozes the same pending record without creating another', async () => {
    const created = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    expect((await repository.snoozeFollowUp(created.id, '2026-07-30T10:00:00.000Z')).id).toBe(
      created.id,
    );
    expect(await repository.listForReading(readingId)).toHaveLength(1);
  });
  it('rejects duplicate pending reminders', async () => {
    const input = { readingId, scheduledFor: '2026-07-20T10:00:00.000Z' };
    await repository.createFollowUp(input);
    await expect(repository.createFollowUp(input)).rejects.toBeInstanceOf(ConflictRepositoryError);
  });
  it('uses null get and NotFound mutation semantics', async () => {
    expect(await repository.getFollowUp('missing')).toBeNull();
    await expect(repository.deleteFollowUp('missing')).rejects.toBeInstanceOf(
      NotFoundRepositoryError,
    );
  });
  it('validates completed outcome and reflection length', async () => {
    const created = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    await expect(
      repository.completeFollowUp(created.id, {
        outcome: 'wrong' as 'happened',
        reflection: null,
        reviewedAt: now,
      }),
    ).rejects.toBeInstanceOf(ValidationRepositoryError);
    await expect(
      repository.completeFollowUp(created.id, {
        outcome: 'happened',
        reflection: 'x'.repeat(5001),
        reviewedAt: now,
      }),
    ).rejects.toBeInstanceOf(ValidationRepositoryError);
  });
  it('notifies mutation listeners', async () => {
    const listener = vi.fn();
    repository.subscribe(listener);
    const created = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    await repository.deleteFollowUp(created.id);
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it('Reading deletion cascades its Follow-Ups but not another Reading', async () => {
    const anotherReading = journalSeedData.readings[1]!.id;
    await repository.createFollowUp({ readingId, scheduledFor: '2026-07-20T10:00:00.000Z' });
    await repository.createFollowUp({
      readingId: anotherReading,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    const summary = await readings.deleteReading(readingId);
    expect(summary.follow_up_count).toBe(1);
    expect(await repository.listForReading(readingId)).toEqual([]);
    expect(await repository.listForReading(anotherReading)).toHaveLength(1);
  });
  it('deleting a Follow-Up never deletes the Reading', async () => {
    const created = await repository.createFollowUp({
      readingId,
      scheduledFor: '2026-07-20T10:00:00.000Z',
    });
    await repository.deleteFollowUp(created.id);
    expect(await readings.getReadingDetail(readingId)).not.toBeNull();
  });
});
