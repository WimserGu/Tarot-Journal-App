import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuestionTemplate, Reading, Topic, UUID } from '../domain/types';
import { tarotCards } from '../domain/tarotCards';
import type {
  QuestionTemplateRepository,
  QuestionTemplateInput,
  QuestionTemplateDetail,
  QuestionTemplateDuplicateQuery,
} from '../features/questions/questionTemplateRepository';
import {
  questionTemplateInputSchema,
  QuestionTemplateNotFoundError,
} from '../features/questions/questionTemplateRepository';
import type {
  ReadingRepository,
  CreateReadingInput,
  UpdateReadingInput,
  ReadingDetail,
  ReadingDeletionSummary,
  ReadingFormContext,
  ReadingListFilters,
  ReadingTimelineItem,
  TopicTimelineFilters,
  QuestionHistoryQuery,
  QuestionHistory,
} from '../features/readings/readingRepository';
import {
  buildQuestionHistory,
  buildReadingDetail,
  buildReadingFormContext,
  buildTopicTimeline,
  ReadingNotFoundError,
} from '../features/readings/readingRepository';
import type {
  TopicRepository,
  TopicDetail,
  TopicListItem,
  TopicDeletionSummary,
} from '../features/topics/topicRepository';
import { buildTopicDetail, TopicNotFoundError } from '../features/topics/topicRepository';
import type { TopicFormValues } from '../features/topics/topicSchema';
import { topicFormSchema } from '../features/topics/topicSchema';
import type { JournalData } from './journalData';
import {
  ConflictRepositoryError,
  ForbiddenRepositoryError,
  NetworkRepositoryError,
  RepositoryError,
  UnauthorizedRepositoryError,
  UnknownRepositoryError,
  ValidationRepositoryError,
} from './repositoryErrors';
import {
  mapQuestionTemplatePositionRow,
  mapQuestionTemplateRow,
  mapReadingCardRow,
  mapReadingRow,
  mapTopicRow,
} from './supabaseMappers';

type DbError = { code?: string; message?: string } | null;
function mapError(error: DbError, operation: string): RepositoryError {
  if (!error) return new UnknownRepositoryError(operation);
  if (error.code === '42501' || /permission|row-level security/i.test(error.message ?? ''))
    return new ForbiddenRepositoryError(operation);
  if (error.code === '23505')
    return new ConflictRepositoryError('A conflicting record already exists.', operation);
  if (error.code === '22023' || error.code === '23514')
    return new ValidationRepositoryError('The request contains invalid data.', operation);
  if (/fetch|network|timeout/i.test(error.message ?? ''))
    return new NetworkRepositoryError(operation);
  return new UnknownRepositoryError(operation);
}

abstract class SupabaseRepositoryBase {
  private readonly listeners = new Set<() => void>();
  constructor(protected readonly client: SupabaseClient) {}
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  protected notify(): void {
    this.listeners.forEach((listener) => listener());
  }
  protected async requireUser(): Promise<UUID> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new UnauthorizedRepositoryError('auth.getUser');
    return data.user.id;
  }
  protected check(error: DbError, operation: string): void {
    if (error) throw mapError(error, operation);
  }
  protected async loadData(): Promise<JournalData> {
    await this.requireUser();
    const [topics, templates, positions, readings, cards] = await Promise.all([
      this.client.from('topics').select('*'),
      this.client.from('question_templates').select('*'),
      this.client.from('question_template_positions').select('*'),
      this.client.from('readings').select('*'),
      this.client.from('reading_cards').select('*'),
    ]);
    [topics, templates, positions, readings, cards].forEach((result) =>
      this.check(result.error, 'loadData'),
    );
    return {
      topics: (topics.data ?? []).map(mapTopicRow),
      question_templates: (templates.data ?? []).map(mapQuestionTemplateRow),
      question_template_positions: (positions.data ?? []).map(mapQuestionTemplatePositionRow),
      readings: (readings.data ?? []).map(mapReadingRow),
      reading_cards: (cards.data ?? []).map(mapReadingCardRow),
      reading_follow_ups: [],
      tarot_cards: tarotCards,
    };
  }
}

export class SupabaseTopicRepository extends SupabaseRepositoryBase implements TopicRepository {
  async listTopics(): Promise<TopicListItem[]> {
    await this.requireUser();
    const { data, error } = await this.client.rpc('list_topics_with_activity');
    this.check(error, 'listTopics');
    return (data ?? []).map((row: Record<string, unknown>) => ({
      topic: mapTopicRow(row),
      fixed_question_count: Number(row.fixed_question_count),
      record_count: Number(row.record_count),
      latest_activity_at: String(row.latest_activity_at),
    }));
  }
  async getTopicDetail(id: UUID): Promise<TopicDetail | null> {
    const user = await this.requireUser();
    return buildTopicDetail(await this.loadData(), user, id);
  }
  async createTopic(input: TopicFormValues): Promise<Topic> {
    const user = await this.requireUser();
    const value = topicFormSchema.parse(input);
    const { data, error } = await this.client
      .from('topics')
      .insert({
        user_id: user,
        title: value.name,
        description: value.description || null,
        icon: value.icon,
        is_pinned: value.isPinned,
      })
      .select('*')
      .single();
    this.check(error, 'createTopic');
    this.notify();
    return mapTopicRow(data as Record<string, unknown>);
  }
  async updateTopic(id: UUID, input: TopicFormValues): Promise<Topic> {
    await this.requireUser();
    const value = topicFormSchema.parse(input);
    const { data, error } = await this.client
      .from('topics')
      .update({
        title: value.name,
        description: value.description || null,
        icon: value.icon,
        is_pinned: value.isPinned,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    this.check(error, 'updateTopic');
    if (!data) throw new TopicNotFoundError();
    this.notify();
    return mapTopicRow(data as Record<string, unknown>);
  }
  async deleteTopic(id: UUID): Promise<TopicDeletionSummary> {
    const detail = await this.getTopicDetail(id);
    if (!detail) throw new TopicNotFoundError();
    const { error } = await this.client.from('topics').delete().eq('id', id);
    this.check(error, 'deleteTopic');
    this.notify();
    return detail.deletion_summary;
  }
}

export class SupabaseQuestionTemplateRepository
  extends SupabaseRepositoryBase
  implements QuestionTemplateRepository
{
  async listQuestionTemplates(topicId: UUID): Promise<QuestionTemplate[]> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('question_templates')
      .select('*')
      .eq('topic_id', topicId)
      .order('display_order');
    this.check(error, 'listQuestionTemplates');
    return (data ?? []).map(mapQuestionTemplateRow);
  }
  async getQuestionTemplate(id: UUID): Promise<QuestionTemplateDetail | null> {
    await this.requireUser();
    const { data, error } = await this.client
      .from('question_templates')
      .select('*, question_template_positions(*)')
      .eq('id', id)
      .maybeSingle();
    this.check(error, 'getQuestionTemplate');
    if (!data) return null;
    const row = data as Record<string, unknown>;
    const positions = Array.isArray(row.question_template_positions)
      ? row.question_template_positions
      : [];
    return {
      question_template: mapQuestionTemplateRow(row),
      positions: positions
        .map((p) => mapQuestionTemplatePositionRow(p as Record<string, unknown>))
        .sort((a, b) => a.position_order - b.position_order),
    };
  }
  async findDuplicateQuestionTemplate(
    query: QuestionTemplateDuplicateQuery,
  ): Promise<QuestionTemplate | null> {
    const normalized = query.question_text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
    return (
      (await this.listQuestionTemplates(query.topic_id)).find(
        (t) =>
          t.id !== query.exclude_id &&
          t.question_text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN') === normalized,
      ) ?? null
    );
  }
  async createQuestionTemplate(input: QuestionTemplateInput): Promise<QuestionTemplate> {
    await this.requireUser();
    const value = questionTemplateInputSchema.parse(input);
    const { data, error } = await this.client.rpc('create_question_template', {
      p_topic_id: value.topic_id,
      p_question_text: value.question_text,
      p_frequency: value.frequency,
      p_is_active: value.is_active,
      p_is_pinned: value.is_pinned,
      p_position_names: value.position_names,
    });
    this.check(error, 'createQuestionTemplate');
    const detail = await this.getQuestionTemplate(String(data));
    if (!detail) throw new UnknownRepositoryError('createQuestionTemplate');
    this.notify();
    return detail.question_template;
  }
  async updateQuestionTemplate(id: UUID, input: QuestionTemplateInput): Promise<QuestionTemplate> {
    await this.requireUser();
    const value = questionTemplateInputSchema.parse(input);
    const { data, error } = await this.client.rpc('update_question_template', {
      p_template_id: id,
      p_topic_id: value.topic_id,
      p_question_text: value.question_text,
      p_frequency: value.frequency,
      p_is_active: value.is_active,
      p_is_pinned: value.is_pinned,
      p_position_names: value.position_names,
    });
    this.check(error, 'updateQuestionTemplate');
    const detail = await this.getQuestionTemplate(String(data));
    if (!detail) throw new QuestionTemplateNotFoundError();
    this.notify();
    return detail.question_template;
  }
  async setQuestionTemplateActive(id: UUID, active: boolean): Promise<QuestionTemplate> {
    const detail = await this.getQuestionTemplate(id);
    if (!detail) throw new QuestionTemplateNotFoundError();
    return this.updateQuestionTemplate(id, {
      ...detail.question_template,
      is_active: active,
      position_names: detail.positions.map((p) => p.position_name),
    });
  }
  async reorderQuestionTemplates(topicId: UUID, ids: UUID[]): Promise<QuestionTemplate[]> {
    await this.requireUser();
    const { error } = await this.client.rpc('reorder_question_templates', {
      p_topic_id: topicId,
      p_template_ids: ids,
    });
    this.check(error, 'reorderQuestionTemplates');
    this.notify();
    return this.listQuestionTemplates(topicId);
  }
  async deleteQuestionTemplate(id: UUID): Promise<void> {
    await this.requireUser();
    const existing = await this.getQuestionTemplate(id);
    if (!existing) throw new QuestionTemplateNotFoundError();
    const { error } = await this.client.rpc('delete_question_template', {
      p_template_id: id,
    });
    this.check(error, 'deleteQuestionTemplate');
    this.notify();
  }
}

export class SupabaseReadingRepository extends SupabaseRepositoryBase implements ReadingRepository {
  async getReadingFormContext(): Promise<ReadingFormContext> {
    return buildReadingFormContext(await this.loadData(), await this.requireUser());
  }
  private rpcInput(input: CreateReadingInput) {
    return {
      p_topic_id: input.topic_id,
      p_question_template_id: input.question_template_id,
      p_temporary_question: input.temporary_question,
      p_reading_at: input.reading_at,
      p_reading_timezone: input.reading_timezone,
      p_interpretation: input.interpretation,
      p_status: input.status,
      p_spread_id: input.spread_id ?? null,
      p_cards: input.cards.map((card) => ({
        tarot_card_id: card.tarot_card_id,
        position_name: card.position_name,
        orientation: card.orientation,
        position_order: card.position_order,
        reversal_expression: card.reversalExpression,
        source: card.source,
        draw_session_id: card.drawSessionId,
        spread_position_id: card.spreadPositionId,
      })),
    };
  }
  async createReading(input: CreateReadingInput): Promise<Reading> {
    await this.requireUser();
    const { data, error } = await this.client.rpc(
      'create_reading_with_cards',
      this.rpcInput(input),
    );
    this.check(error, 'createReading');
    const detail = await this.getReadingDetail(String(data));
    if (!detail) throw new UnknownRepositoryError('createReading');
    this.notify();
    return detail.reading;
  }
  async updateReading(id: UUID, input: UpdateReadingInput): Promise<Reading> {
    await this.requireUser();
    const { data, error } = await this.client.rpc('update_reading_with_cards', {
      p_reading_id: id,
      ...this.rpcInput(input),
    });
    this.check(error, 'updateReading');
    const detail = await this.getReadingDetail(String(data));
    if (!detail) throw new ReadingNotFoundError();
    this.notify();
    return detail.reading;
  }
  async getReadingDetail(id: UUID): Promise<ReadingDetail | null> {
    const user = await this.requireUser();
    return buildReadingDetail(await this.loadData(), user, id);
  }
  async listReadings(filters: ReadingListFilters = {}): Promise<ReadingTimelineItem[]> {
    const data = await this.loadData();
    const user = await this.requireUser();
    const topics = filters.topic_id
      ? [filters.topic_id]
      : data.topics.filter((t) => t.user_id === user).map((t) => t.id);
    const all = topics.flatMap((topic_id) => buildTopicTimeline(data, user, { topic_id }));
    const q = filters.text_query?.toLowerCase();
    return all.filter(
      (item) =>
        (!filters.question_template_id ||
          item.reading.question_template_id === filters.question_template_id) &&
        (!filters.status || item.reading.status === filters.status) &&
        (filters.is_favorite === undefined || item.reading.is_favorite === filters.is_favorite) &&
        (!filters.date_from || item.reading.reading_at >= filters.date_from) &&
        (!filters.date_to || item.reading.reading_at <= filters.date_to) &&
        (!q || item.question_text.toLowerCase().includes(q)),
    );
  }
  async getTopicTimeline(filters: TopicTimelineFilters): Promise<ReadingTimelineItem[]> {
    return buildTopicTimeline(await this.loadData(), await this.requireUser(), filters);
  }
  async getQuestionHistory(query: QuestionHistoryQuery): Promise<QuestionHistory | null> {
    return buildQuestionHistory(await this.loadData(), await this.requireUser(), query);
  }
  async toggleFavorite(id: UUID): Promise<Reading> {
    await this.requireUser();
    const detail = await this.getReadingDetail(id);
    if (!detail) throw new ReadingNotFoundError();
    const { data, error } = await this.client
      .from('readings')
      .update({ is_favorite: !detail.reading.is_favorite })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    this.check(error, 'toggleFavorite');
    if (!data) throw new ReadingNotFoundError();
    this.notify();
    return mapReadingRow(data as Record<string, unknown>);
  }
  async deleteReading(id: UUID): Promise<ReadingDeletionSummary> {
    await this.requireUser();
    const detail = await this.getReadingDetail(id);
    if (!detail) throw new ReadingNotFoundError();
    const followUps = await this.client
      .from('reading_follow_ups')
      .select('id')
      .eq('reading_id', id);
    this.check(followUps.error, 'deleteReading.followUps');
    const { error } = await this.client.from('readings').delete().eq('id', id);
    this.check(error, 'deleteReading');
    this.notify();
    return {
      reading_id: id,
      card_count: detail.cards.length,
      follow_up_count: followUps.data?.length ?? 0,
    };
  }
}
