import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260713090039_reading_follow_ups.sql'),
  'utf8',
);

describe('Follow-Up migration', () => {
  it('uses Reading cascade, strict states, RLS and explicit Data API grants', () => {
    expect(migration).toContain('references public.readings(id) on delete cascade');
    expect(migration).toContain("status in ('scheduled', 'completed')");
    expect(migration).toContain('alter table public.reading_follow_ups enable row level security');
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.reading_follow_ups to authenticated',
    );
  });
  it('validates current-user ownership of the linked Reading', () => {
    expect(migration).toContain('readings.user_id = (select auth.uid())');
    expect(migration).toContain('(select auth.uid()) = user_id');
  });
  it('prevents exact duplicate pending schedules without restricting completed history', () => {
    expect(migration).toContain("where status = 'scheduled'");
  });
});
