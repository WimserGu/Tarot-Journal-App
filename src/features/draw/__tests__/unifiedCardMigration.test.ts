import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260713103538_unified_card_entry.sql'),
  'utf8',
);

describe('unified card-entry migration', () => {
  it('adds safe defaults without creating a DrawSession table', () => {
    expect(sql).toContain("add column source text not null default 'manual'");
    expect(sql).toContain('add column draw_session_id uuid');
    expect(sql).toContain('add column reversal_expression text');
    expect(sql).not.toMatch(/create table\s+public\.draw_sessions/i);
  });
  it('constrains source, expression and orientation combinations', () => {
    expect(sql).toContain("source in ('drawn', 'manual')");
    expect(sql).toContain("orientation = 'reversed' or reversal_expression is null");
    expect(sql).toContain("source = 'manual' and draw_session_id is null");
  });
  it('updates atomic Reading RPCs without changing RLS grants', () => {
    expect(sql).toContain('create or replace function public.create_reading_with_cards');
    expect(sql).toContain('create or replace function public.update_reading_with_cards');
    expect(sql).toContain('security invoker');
    expect(sql).not.toMatch(/service_role/i);
    expect(sql).not.toMatch(/create policy/i);
  });
});
