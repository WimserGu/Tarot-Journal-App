import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260714180000_question_tags_phase_1.sql'),
  'utf8',
);

describe('question tag migration', () => {
  it('scopes unique names and Reading references to user and Topic', () => {
    expect(sql).toContain('unique (user_id,topic_id,normalized_name)');
    expect(sql).toContain('foreign key (question_tag_id,topic_id,user_id)');
    expect(sql).toContain('references public.question_tags(id,topic_id,user_id)');
  });

  it('enables RLS with explicit authenticated policies and no anonymous access', () => {
    expect(sql).toContain('alter table public.question_tags enable row level security');
    expect(sql).toContain('for select to authenticated');
    expect(sql).toContain('for insert to authenticated');
    expect(sql).toContain('revoke all on public.question_tags from anon');
  });
});
