import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ForbiddenRepositoryError,
  NetworkRepositoryError,
  UnauthorizedRepositoryError,
} from '../repositoryErrors';
import {
  SupabaseQuestionTemplateRepository,
  SupabaseReadingRepository,
  SupabaseTopicRepository,
} from '../supabaseRepositories';

const now = '2026-07-12T00:00:00.000Z';
const topic = {
  id: 'topic',
  user_id: 'user',
  title: 'Topic',
  description: null,
  icon: 'book',
  is_pinned: false,
  archived_at: null,
  created_at: now,
  updated_at: now,
};
const reading = {
  id: 'reading',
  user_id: 'user',
  topic_id: 'topic',
  question_template_id: null,
  question_text_snapshot: 'Question',
  reading_at: now,
  reading_timezone: 'UTC',
  interpretation: null,
  reality_feedback: null,
  status: 'draft',
  is_favorite: false,
  created_at: now,
  updated_at: now,
};
const card = {
  id: 'card',
  user_id: 'user',
  reading_id: 'reading',
  tarot_card_id: null,
  position_order: 1,
  position_name: null,
  orientation: 'upright',
  created_at: now,
  updated_at: now,
};

function client(
  options: {
    user?: boolean;
    rpcError?: { code?: string; message?: string };
    rpcData?: unknown;
  } = {},
): SupabaseClient {
  const rows: Record<string, unknown[]> = {
    topics: [topic],
    question_templates: [],
    question_template_positions: [],
    readings: [reading],
    reading_cards: [card],
  };
  return {
    auth: {
      getUser: vi.fn(async () =>
        options.user === false
          ? { data: { user: null }, error: { message: 'no' } }
          : { data: { user: { id: 'user' } }, error: null },
      ),
    },
    rpc: vi.fn(async () => ({ data: options.rpcData, error: options.rpcError ?? null })),
    from: vi.fn((table: string) => ({
      select: vi.fn(async () => ({ data: rows[table] ?? [], error: null })),
    })),
  } as unknown as SupabaseClient;
}

describe('mocked Supabase repositories', () => {
  it('maps missing sessions to Unauthorized', async () => {
    await expect(
      new SupabaseTopicRepository(client({ user: false })).listTopics(),
    ).rejects.toBeInstanceOf(UnauthorizedRepositoryError);
  });
  it.each([
    [{ code: '42501', message: 'row-level security' }, ForbiddenRepositoryError],
    [{ message: 'Failed to fetch' }, NetworkRepositoryError],
  ])('maps database errors without exposing raw errors', async (error, Expected) => {
    await expect(
      new SupabaseTopicRepository(client({ rpcError: error })).listTopics(),
    ).rejects.toBeInstanceOf(Expected);
  });
  it('uses the topic activity RPC and maps its calculated fields', async () => {
    const fake = client({
      rpcData: [{ ...topic, fixed_question_count: 2, record_count: 3, latest_activity_at: now }],
    });
    const result = await new SupabaseTopicRepository(fake).listTopics();
    expect(result[0]).toMatchObject({
      fixed_question_count: 2,
      record_count: 3,
      latest_activity_at: now,
    });
    expect(fake.rpc).toHaveBeenCalledWith('list_topics_with_activity');
  });
  it('creates Reading atomically, refetches detail and notifies local listeners', async () => {
    const fake = client({ rpcData: 'reading' });
    const repo = new SupabaseReadingRepository(fake);
    const listener = vi.fn();
    repo.subscribe(listener);
    const result = await repo.createReading({
      topic_id: 'topic',
      question_template_id: null,
      temporary_question: 'Question',
      reading_at: now,
      reading_timezone: 'UTC',
      interpretation: null,
      status: 'draft',
      cards: [
        {
          tarot_card_id: 1,
          position_name: null,
          orientation: 'reversed',
          position_order: 1,
          reversalExpression: 'overexpressed',
          source: 'drawn',
          drawSessionId: '40000000-0000-4000-8000-000000000009',
        },
      ],
    });
    expect(result.id).toBe('reading');
    expect(fake.rpc).toHaveBeenCalledWith('create_reading_with_cards', expect.any(Object));
    expect(fake.rpc).toHaveBeenCalledWith(
      'create_reading_with_cards',
      expect.objectContaining({
        p_cards: [
          expect.objectContaining({
            source: 'drawn',
            draw_session_id: '40000000-0000-4000-8000-000000000009',
            reversal_expression: 'overexpressed',
          }),
        ],
      }),
    );
    expect(listener).toHaveBeenCalledOnce();
  });
  it('uses the atomic template reorder RPC and notifies listeners', async () => {
    const template = {
      id: 'q',
      user_id: 'user',
      topic_id: 'topic',
      question_text: 'Q',
      frequency: 'daily',
      is_active: true,
      is_pinned: false,
      display_order: 1,
      created_at: now,
      updated_at: now,
    };
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const order = vi.fn(async () => ({ data: [template], error: null }));
    const eq = vi.fn(() => ({ order }));
    const fake = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user' } }, error: null })) },
      rpc,
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as unknown as SupabaseClient;
    const repo = new SupabaseQuestionTemplateRepository(fake);
    const listener = vi.fn();
    repo.subscribe(listener);
    expect((await repo.reorderQuestionTemplates('topic', ['q']))[0]?.displayOrder).toBe(1);
    expect(rpc).toHaveBeenCalledWith('reorder_question_templates', {
      p_topic_id: 'topic',
      p_template_ids: ['q'],
    });
    expect(listener).toHaveBeenCalledOnce();
  });
});
