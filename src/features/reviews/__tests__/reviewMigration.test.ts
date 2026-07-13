import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve('supabase/migrations/20260713073610_weekly_monthly_reviews.sql'),
  'utf8',
).toLowerCase();

describe('Prompt 18 migration', () => {
  it('creates only the RLS-protected Review snapshot table with a database unique key', () => {
    expect(sql).toContain('create table public.reviews');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('unique (user_id, review_type, period_start, timezone)');
    expect(sql).toContain('to authenticated');
    expect(sql).toContain('(select auth.uid()) = user_id');
  });
  it('grants minimum CRUD access and does not add statistics aggregation RPCs or views', () => {
    expect(sql).toContain(
      'grant select, insert, update, delete on table public.reviews to authenticated',
    );
    expect(sql).not.toMatch(/create\s+(or\s+replace\s+)?view/);
    expect(sql).not.toMatch(
      /create\s+(or\s+replace\s+)?function\s+public\.(calculate|aggregate|statistics)/,
    );
  });
  it('validates period, enum, snapshot, summary and IANA timezone boundaries', () => {
    expect(sql).toContain('period_end > period_start');
    expect(sql).toContain("review_type in ('weekly', 'monthly')");
    expect(sql).toContain("jsonb_typeof(statistics_snapshot) = 'object'");
    expect(sql).toContain('length(personal_summary) <= 5000');
    expect(sql).toContain('pg_catalog.pg_timezone_names');
  });
});
