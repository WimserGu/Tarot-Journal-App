import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260713163935_draw_session_persistence.sql'),
  'utf8',
);

describe('DrawSession migration', () => {
  it('creates isolated session and card tables with one active draft per user', () => {
    expect(sql).toMatch(/create table public\.draw_sessions/i);
    expect(sql).toMatch(/create table public\.draw_session_cards/i);
    expect(sql).toMatch(/draw_sessions_one_draft_per_user_idx/i);
    expect(sql).toMatch(/enable row level security/i);
  });

  it('does not alter the existing Reading schema', () => {
    expect(sql).not.toMatch(/alter table public\.readings/i);
    expect(sql).not.toMatch(/alter table public\.reading_cards/i);
  });
});
