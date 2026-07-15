import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260715084125_add_reading_card_interpretations.sql'),
  'utf8',
);

describe('reading card interpretation migration', () => {
  it('adds a bounded nullable interpretation column', () => {
    expect(sql).toContain('add column interpretation text');
    expect(sql).toContain('char_length(interpretation) <= 5000');
  });

  it('keeps atomic Reading RPCs and writes card interpretations', () => {
    expect(sql).toContain('create or replace function public.create_reading_with_cards');
    expect(sql).toContain('create or replace function public.update_reading_with_cards');
    expect(sql).toContain('spread_position_id,interpretation');
    expect(sql).toContain("nullif(btrim(c->>'interpretation'),'')");
    expect(sql).toContain('security invoker');
  });
});
