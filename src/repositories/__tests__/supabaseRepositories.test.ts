import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ForbiddenRepositoryError,
  NetworkRepositoryError,
  UnauthorizedRepositoryError,
} from '../repositoryErrors';
import {
  SupabaseQuestionTagRepository,
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
    rpcResponses?: {
      data: unknown;
      error: { code?: string; message?: string } | null;
    }[];
    tableErrors?: Record<string, { code?: string; message?: string }>;
  } = {},
): SupabaseClient {
  const rows: Record<string, unknown[]> = {
    topics: [topic],
    question_templates: [],
    question_template_positions: [],
    readings: [reading],
    reading_cards: [card],
  };
  const responses = [...(options.rpcResponses ?? [])];
  return {
    auth: {
      getUser: vi.fn(async () =>
        options.user === false
          ? { data: { user: null }, error: { message: 'no' } }
          : { data: { user: { id: 'user' } }, error: null },
      ),
    },
    rpc: vi.fn(
      async () => responses.shift() ?? { data: options.rpcData, error: options.rpcError ?? null },
    ),
    from: vi.fn((table: string) => ({
      select: vi.fn(async () => ({
        data: rows[table] ?? [],
        error: options.tableErrors?.[table] ?? null,
      })),
    })),
  } as unknown as SupabaseClient;
}

describe('mocked Supabase repositories', () => {
  it('assigns one question tag to a validated set of Topic readings', async () => {
    let updatingReadings = false;
    const readingsBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      update: vi.fn(),
      then: vi.fn(),
    };
    readingsBuilder.select.mockReturnValue(readingsBuilder);
    readingsBuilder.eq.mockReturnValue(readingsBuilder);
    readingsBuilder.in.mockReturnValue(readingsBuilder);
    readingsBuilder.update.mockImplementation(() => {
      updatingReadings = true;
      return readingsBuilder;
    });
    readingsBuilder.then.mockImplementation((resolve: (value: unknown) => unknown) =>
      resolve({
        data: updatingReadings ? [{ ...reading, question_tag_id: 'tag' }] : [{ id: reading.id }],
        error: null,
      }),
    );
    const tagBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: { id: 'tag' }, error: null })),
    };
    const fake = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user' } }, error: null })),
      },
      from: vi.fn((table: string) => (table === 'question_tags' ? tagBuilder : readingsBuilder)),
    } as unknown as SupabaseClient;

    const result = await new SupabaseReadingRepository(fake).assignQuestionTag({
      topic_id: 'topic',
      question_tag_id: 'tag',
      reading_ids: ['reading'],
    });

    expect(result[0]?.question_tag_id).toBe('tag');
    expect(readingsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ question_tag_id: 'tag' }),
    );
  });

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
          reversalVariant: 'right',
          source: 'drawn',
          drawSessionId: '40000000-0000-4000-8000-000000000009',
          interpretation: '继续观察，不急着下结论。',
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
            interpretation: '继续观察，不急着下结论。',
          }),
        ],
      }),
    );
    expect(listener).toHaveBeenCalledOnce();
  });
  it('keeps the Reading form available before the optional question-tags migration is deployed', async () => {
    const fake = client({
      tableErrors: {
        question_tags: {
          code: 'PGRST205',
          message: "Could not find the table 'public.question_tags' in the schema cache",
        },
      },
    });

    const context = await new SupabaseReadingRepository(fake).getReadingFormContext();

    expect(context.question_tags).toEqual([]);
    expect(context.topics).toHaveLength(1);
  });
  it('retries an untagged Reading against the pre-question-tags RPC signature', async () => {
    const fake = client({
      rpcResponses: [
        {
          data: null,
          error: {
            code: 'PGRST202',
            message:
              'Could not find the function public.create_reading_with_cards with parameter p_question_tag_id',
          },
        },
        { data: 'reading', error: null },
      ],
      tableErrors: {
        question_tags: {
          code: '42P01',
          message: 'relation "question_tags" does not exist',
        },
      },
    });
    const repo = new SupabaseReadingRepository(fake);

    await repo.createReading({
      topic_id: 'topic',
      question_template_id: null,
      question_tag_id: null,
      temporary_question: 'Question',
      reading_at: now,
      reading_timezone: 'UTC',
      interpretation: null,
      status: 'draft',
      cards: [],
    });

    expect(fake.rpc).toHaveBeenNthCalledWith(
      1,
      'create_reading_with_cards',
      expect.objectContaining({ p_question_tag_id: null }),
    );
    expect(fake.rpc).toHaveBeenNthCalledWith(
      2,
      'create_reading_with_cards',
      expect.not.objectContaining({ p_question_tag_id: expect.anything() }),
    );
  });
  it('deletes a question tag through the authenticated repository and notifies listeners', async () => {
    const maybeSingle = vi.fn(async () => ({ data: { id: 'tag' }, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const remove = vi.fn(() => ({ eq }));
    const fake = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user' } }, error: null })) },
      from: vi.fn(() => ({ delete: remove })),
    } as unknown as SupabaseClient;
    const repository = new SupabaseQuestionTagRepository(fake);
    const listener = vi.fn();
    repository.subscribe(listener);

    await repository.deleteQuestionTag('tag');

    expect(fake.from).toHaveBeenCalledWith('question_tags');
    expect(eq).toHaveBeenCalledWith('id', 'tag');
    expect(select).toHaveBeenCalledWith('id');
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
