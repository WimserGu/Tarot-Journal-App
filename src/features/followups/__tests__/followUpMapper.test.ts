import { describe, expect, it } from 'vitest';
import { ValidationRepositoryError } from '../../../repositories/repositoryErrors';
import { mapFollowUpRow, toFollowUpInsertRow, toFollowUpUpdateRow } from '../followUpMapper';

const base = {
  id: 'follow-up',
  user_id: 'user',
  reading_id: 'reading',
  scheduled_for: '2026-07-20T10:00:00.000Z',
  reviewed_at: null,
  status: 'scheduled',
  outcome: null,
  reflection: null,
  created_at: '2026-07-13T10:00:00.000Z',
  updated_at: '2026-07-13T10:00:00.000Z',
};

describe('Follow-Up mapper', () => {
  it('maps a scheduled snake_case row', () =>
    expect(mapFollowUpRow(base)).toMatchObject({
      readingId: 'reading',
      scheduledFor: base.scheduled_for,
      status: 'scheduled',
      reviewedAt: null,
    }));
  it('maps a completed row', () =>
    expect(
      mapFollowUpRow({
        ...base,
        status: 'completed',
        outcome: 'happened',
        reviewed_at: '2026-07-21T10:00:00.000Z',
        reflection: 'line 1\nline 2',
      }),
    ).toMatchObject({ outcome: 'happened', reflection: 'line 1\nline 2' }));
  it.each(['happened', 'partly_happened', 'did_not_happen', 'still_unclear'])(
    'accepts outcome %s',
    (outcome) =>
      expect(
        mapFollowUpRow({
          ...base,
          status: 'completed',
          outcome,
          reviewed_at: '2026-07-21T10:00:00.000Z',
        }).outcome,
      ).toBe(outcome),
  );
  it('rejects unknown status', () =>
    expect(() => mapFollowUpRow({ ...base, status: 'waiting' })).toThrow(
      ValidationRepositoryError,
    ));
  it('rejects unknown outcome', () =>
    expect(() =>
      mapFollowUpRow({
        ...base,
        status: 'completed',
        outcome: 'accurate',
        reviewed_at: '2026-07-21T10:00:00.000Z',
      }),
    ).toThrow(ValidationRepositoryError));
  it('rejects completed without reviewedAt', () =>
    expect(() => mapFollowUpRow({ ...base, status: 'completed', outcome: 'happened' })).toThrow(
      ValidationRepositoryError,
    ));
  it('rejects completed without outcome', () =>
    expect(() =>
      mapFollowUpRow({ ...base, status: 'completed', reviewed_at: '2026-07-21T10:00:00.000Z' }),
    ).toThrow(ValidationRepositoryError));
  it('rejects scheduled with outcome', () =>
    expect(() => mapFollowUpRow({ ...base, outcome: 'happened' })).toThrow(
      ValidationRepositoryError,
    ));
  it('keeps nullable reflection', () => expect(mapFollowUpRow(base).reflection).toBeNull());
  it('maps insert/update payloads without accepting user_id', () => {
    expect(toFollowUpInsertRow({ readingId: 'reading', scheduledFor: base.scheduled_for })).toEqual(
      {
        reading_id: 'reading',
        scheduled_for: base.scheduled_for,
        reviewed_at: null,
        status: 'scheduled',
        outcome: null,
        reflection: null,
      },
    );
    expect(toFollowUpUpdateRow({ reflection: 'kept\nlines' })).toEqual({
      reflection: 'kept\nlines',
    });
  });
});
