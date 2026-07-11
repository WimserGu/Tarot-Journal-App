-- Tarot Journal App MVP schema.
-- This migration is designed for Supabase Postgres and has not been executed.

begin;

-- ---------------------------------------------------------------------------
-- Shared canonical tarot catalog
-- ---------------------------------------------------------------------------

create table public.tarot_cards (
  id smallint primary key,
  card_key text not null unique,
  name_zh text not null,
  name_en text not null,
  arcana text not null,
  suit text,
  rank_code text not null,
  rank_order smallint not null,
  sort_order smallint not null unique,
  constraint tarot_cards_id_check check (id between 0 and 77),
  constraint tarot_cards_arcana_check check (arcana in ('major', 'minor')),
  constraint tarot_cards_suit_check check (
    (arcana = 'major' and suit is null)
    or
    (arcana = 'minor' and suit in ('wands', 'cups', 'swords', 'pentacles'))
  ),
  constraint tarot_cards_rank_order_check check (rank_order between 0 and 21)
);

insert into public.tarot_cards
  (id, card_key, name_zh, name_en, arcana, suit, rank_code, rank_order, sort_order)
values
  (0, 'major_fool', '愚者', 'The Fool', 'major', null, '0', 0, 0),
  (1, 'major_magician', '魔术师', 'The Magician', 'major', null, '1', 1, 1),
  (2, 'major_high_priestess', '女祭司', 'The High Priestess', 'major', null, '2', 2, 2),
  (3, 'major_empress', '皇后', 'The Empress', 'major', null, '3', 3, 3),
  (4, 'major_emperor', '皇帝', 'The Emperor', 'major', null, '4', 4, 4),
  (5, 'major_hierophant', '教皇', 'The Hierophant', 'major', null, '5', 5, 5),
  (6, 'major_lovers', '恋人', 'The Lovers', 'major', null, '6', 6, 6),
  (7, 'major_chariot', '战车', 'The Chariot', 'major', null, '7', 7, 7),
  (8, 'major_strength', '力量', 'Strength', 'major', null, '8', 8, 8),
  (9, 'major_hermit', '隐者', 'The Hermit', 'major', null, '9', 9, 9),
  (10, 'major_wheel_of_fortune', '命运之轮', 'Wheel of Fortune', 'major', null, '10', 10, 10),
  (11, 'major_justice', '正义', 'Justice', 'major', null, '11', 11, 11),
  (12, 'major_hanged_man', '倒吊人', 'The Hanged Man', 'major', null, '12', 12, 12),
  (13, 'major_death', '死神', 'Death', 'major', null, '13', 13, 13),
  (14, 'major_temperance', '节制', 'Temperance', 'major', null, '14', 14, 14),
  (15, 'major_devil', '恶魔', 'The Devil', 'major', null, '15', 15, 15),
  (16, 'major_tower', '高塔', 'The Tower', 'major', null, '16', 16, 16),
  (17, 'major_star', '星星', 'The Star', 'major', null, '17', 17, 17),
  (18, 'major_moon', '月亮', 'The Moon', 'major', null, '18', 18, 18),
  (19, 'major_sun', '太阳', 'The Sun', 'major', null, '19', 19, 19),
  (20, 'major_judgement', '审判', 'Judgement', 'major', null, '20', 20, 20),
  (21, 'major_world', '世界', 'The World', 'major', null, '21', 21, 21),
  (22, 'wands_ace', '权杖一', 'Ace of Wands', 'minor', 'wands', 'ace', 1, 22),
  (23, 'wands_two', '权杖二', 'Two of Wands', 'minor', 'wands', 'two', 2, 23),
  (24, 'wands_three', '权杖三', 'Three of Wands', 'minor', 'wands', 'three', 3, 24),
  (25, 'wands_four', '权杖四', 'Four of Wands', 'minor', 'wands', 'four', 4, 25),
  (26, 'wands_five', '权杖五', 'Five of Wands', 'minor', 'wands', 'five', 5, 26),
  (27, 'wands_six', '权杖六', 'Six of Wands', 'minor', 'wands', 'six', 6, 27),
  (28, 'wands_seven', '权杖七', 'Seven of Wands', 'minor', 'wands', 'seven', 7, 28),
  (29, 'wands_eight', '权杖八', 'Eight of Wands', 'minor', 'wands', 'eight', 8, 29),
  (30, 'wands_nine', '权杖九', 'Nine of Wands', 'minor', 'wands', 'nine', 9, 30),
  (31, 'wands_ten', '权杖十', 'Ten of Wands', 'minor', 'wands', 'ten', 10, 31),
  (32, 'wands_page', '权杖侍从', 'Page of Wands', 'minor', 'wands', 'page', 11, 32),
  (33, 'wands_knight', '权杖骑士', 'Knight of Wands', 'minor', 'wands', 'knight', 12, 33),
  (34, 'wands_queen', '权杖皇后', 'Queen of Wands', 'minor', 'wands', 'queen', 13, 34),
  (35, 'wands_king', '权杖国王', 'King of Wands', 'minor', 'wands', 'king', 14, 35),
  (36, 'cups_ace', '圣杯一', 'Ace of Cups', 'minor', 'cups', 'ace', 1, 36),
  (37, 'cups_two', '圣杯二', 'Two of Cups', 'minor', 'cups', 'two', 2, 37),
  (38, 'cups_three', '圣杯三', 'Three of Cups', 'minor', 'cups', 'three', 3, 38),
  (39, 'cups_four', '圣杯四', 'Four of Cups', 'minor', 'cups', 'four', 4, 39),
  (40, 'cups_five', '圣杯五', 'Five of Cups', 'minor', 'cups', 'five', 5, 40),
  (41, 'cups_six', '圣杯六', 'Six of Cups', 'minor', 'cups', 'six', 6, 41),
  (42, 'cups_seven', '圣杯七', 'Seven of Cups', 'minor', 'cups', 'seven', 7, 42),
  (43, 'cups_eight', '圣杯八', 'Eight of Cups', 'minor', 'cups', 'eight', 8, 43),
  (44, 'cups_nine', '圣杯九', 'Nine of Cups', 'minor', 'cups', 'nine', 9, 44),
  (45, 'cups_ten', '圣杯十', 'Ten of Cups', 'minor', 'cups', 'ten', 10, 45),
  (46, 'cups_page', '圣杯侍从', 'Page of Cups', 'minor', 'cups', 'page', 11, 46),
  (47, 'cups_knight', '圣杯骑士', 'Knight of Cups', 'minor', 'cups', 'knight', 12, 47),
  (48, 'cups_queen', '圣杯皇后', 'Queen of Cups', 'minor', 'cups', 'queen', 13, 48),
  (49, 'cups_king', '圣杯国王', 'King of Cups', 'minor', 'cups', 'king', 14, 49),
  (50, 'swords_ace', '宝剑一', 'Ace of Swords', 'minor', 'swords', 'ace', 1, 50),
  (51, 'swords_two', '宝剑二', 'Two of Swords', 'minor', 'swords', 'two', 2, 51),
  (52, 'swords_three', '宝剑三', 'Three of Swords', 'minor', 'swords', 'three', 3, 52),
  (53, 'swords_four', '宝剑四', 'Four of Swords', 'minor', 'swords', 'four', 4, 53),
  (54, 'swords_five', '宝剑五', 'Five of Swords', 'minor', 'swords', 'five', 5, 54),
  (55, 'swords_six', '宝剑六', 'Six of Swords', 'minor', 'swords', 'six', 6, 55),
  (56, 'swords_seven', '宝剑七', 'Seven of Swords', 'minor', 'swords', 'seven', 7, 56),
  (57, 'swords_eight', '宝剑八', 'Eight of Swords', 'minor', 'swords', 'eight', 8, 57),
  (58, 'swords_nine', '宝剑九', 'Nine of Swords', 'minor', 'swords', 'nine', 9, 58),
  (59, 'swords_ten', '宝剑十', 'Ten of Swords', 'minor', 'swords', 'ten', 10, 59),
  (60, 'swords_page', '宝剑侍从', 'Page of Swords', 'minor', 'swords', 'page', 11, 60),
  (61, 'swords_knight', '宝剑骑士', 'Knight of Swords', 'minor', 'swords', 'knight', 12, 61),
  (62, 'swords_queen', '宝剑皇后', 'Queen of Swords', 'minor', 'swords', 'queen', 13, 62),
  (63, 'swords_king', '宝剑国王', 'King of Swords', 'minor', 'swords', 'king', 14, 63),
  (64, 'pentacles_ace', '星币一', 'Ace of Pentacles', 'minor', 'pentacles', 'ace', 1, 64),
  (65, 'pentacles_two', '星币二', 'Two of Pentacles', 'minor', 'pentacles', 'two', 2, 65),
  (66, 'pentacles_three', '星币三', 'Three of Pentacles', 'minor', 'pentacles', 'three', 3, 66),
  (67, 'pentacles_four', '星币四', 'Four of Pentacles', 'minor', 'pentacles', 'four', 4, 67),
  (68, 'pentacles_five', '星币五', 'Five of Pentacles', 'minor', 'pentacles', 'five', 5, 68),
  (69, 'pentacles_six', '星币六', 'Six of Pentacles', 'minor', 'pentacles', 'six', 6, 69),
  (70, 'pentacles_seven', '星币七', 'Seven of Pentacles', 'minor', 'pentacles', 'seven', 7, 70),
  (71, 'pentacles_eight', '星币八', 'Eight of Pentacles', 'minor', 'pentacles', 'eight', 8, 71),
  (72, 'pentacles_nine', '星币九', 'Nine of Pentacles', 'minor', 'pentacles', 'nine', 9, 72),
  (73, 'pentacles_ten', '星币十', 'Ten of Pentacles', 'minor', 'pentacles', 'ten', 10, 73),
  (74, 'pentacles_page', '星币侍从', 'Page of Pentacles', 'minor', 'pentacles', 'page', 11, 74),
  (75, 'pentacles_knight', '星币骑士', 'Knight of Pentacles', 'minor', 'pentacles', 'knight', 12, 75),
  (76, 'pentacles_queen', '星币皇后', 'Queen of Pentacles', 'minor', 'pentacles', 'queen', 13, 76),
  (77, 'pentacles_king', '星币国王', 'King of Pentacles', 'minor', 'pentacles', 'king', 14, 77);

-- ---------------------------------------------------------------------------
-- User-owned content
-- ---------------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null,
  description text,
  icon text not null default 'sparkles',
  is_pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_title_check check (char_length(btrim(title)) between 1 and 120),
  constraint topics_description_check check (
    description is null or char_length(description) <= 5000
  ),
  constraint topics_icon_check check (
    icon in ('book', 'briefcase', 'compass', 'heart', 'moon', 'sparkles')
  ),
  constraint topics_id_user_key unique (id, user_id)
);

create table public.question_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  topic_id uuid not null,
  question_text text not null,
  frequency text not null default 'as_needed',
  is_active boolean not null default true,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_templates_text_check check (
    char_length(btrim(question_text)) between 1 and 1000
  ),
  constraint question_templates_frequency_check check (
    frequency in ('as_needed', 'daily', 'weekly')
  ),
  constraint question_templates_id_user_key unique (id, user_id),
  constraint question_templates_id_topic_user_key unique (id, topic_id, user_id),
  constraint question_templates_topic_owner_fk
    foreign key (topic_id, user_id)
    references public.topics (id, user_id)
    on delete cascade
);

create table public.question_template_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  question_template_id uuid not null,
  position_order integer not null,
  position_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_template_positions_order_check check (position_order >= 1),
  constraint question_template_positions_name_check check (
    char_length(btrim(position_name)) between 1 and 120
  ),
  constraint question_template_positions_order_key unique (
    question_template_id,
    position_order
  ) deferrable initially deferred,
  constraint question_template_positions_template_owner_fk
    foreign key (question_template_id, user_id)
    references public.question_templates (id, user_id)
    on delete cascade
);

create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  topic_id uuid,
  question_template_id uuid,
  question_text_snapshot text,
  reading_at timestamptz not null default now(),
  reading_timezone text not null default 'UTC',
  interpretation text,
  reality_feedback text,
  status text not null default 'draft',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint readings_question_snapshot_check check (
    char_length(btrim(question_text_snapshot)) between 1 and 1000
  ),
  constraint readings_timezone_check check (
    char_length(btrim(reading_timezone)) between 1 and 64
  ),
  constraint readings_interpretation_check check (
    interpretation is null or char_length(interpretation) <= 20000
  ),
  constraint readings_feedback_check check (
    reality_feedback is null or char_length(reality_feedback) <= 20000
  ),
  constraint readings_status_check check (status in ('draft', 'completed')),
  constraint readings_completed_fields_check check (
    status = 'draft'
    or (
      topic_id is not null
      and nullif(btrim(question_text_snapshot), '') is not null
    )
  ),
  constraint readings_id_user_key unique (id, user_id),
  constraint readings_topic_owner_fk
    foreign key (topic_id, user_id)
    references public.topics (id, user_id)
    on delete cascade,
  constraint readings_template_context_fk
    foreign key (question_template_id, topic_id, user_id)
    references public.question_templates (id, topic_id, user_id)
    on delete set null (question_template_id)
    deferrable initially deferred
);

create table public.reading_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  reading_id uuid not null,
  tarot_card_id smallint,
  position_order integer not null,
  position_name text,
  orientation text not null default 'upright',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_cards_order_check check (position_order >= 1),
  constraint reading_cards_position_name_check check (
    position_name is null or char_length(position_name) <= 120
  ),
  constraint reading_cards_orientation_check check (
    orientation in ('upright', 'reversed')
  ),
  constraint reading_cards_reading_order_key unique (reading_id, position_order)
    deferrable initially deferred,
  constraint reading_cards_reading_owner_fk
    foreign key (reading_id, user_id)
    references public.readings (id, user_id)
    on delete cascade,
  constraint reading_cards_tarot_card_fk
    foreign key (tarot_card_id)
    references public.tarot_cards (id)
    on delete restrict
);

comment on column public.readings.question_text_snapshot is
  'May be null for an incomplete draft; immutable for completed fixed-question readings.';
comment on column public.reading_cards.tarot_card_id is
  'Nullable only while the parent reading is a draft.';

-- ---------------------------------------------------------------------------
-- Integrity and timestamp triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_reading_question_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  template_question_text text;
begin
  if new.question_template_id is null then
    if new.status = 'completed'
      and nullif(btrim(new.question_text_snapshot), '') is null then
      raise exception 'Temporary readings require a question text snapshot.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.question_template_id is not distinct from old.question_template_id
    and new.topic_id is not distinct from old.topic_id then
    new.question_text_snapshot := old.question_text_snapshot;
    return new;
  end if;

  select question_text
    into template_question_text
  from public.question_templates
  where id = new.question_template_id
    and topic_id = new.topic_id
    and user_id = new.user_id;

  if not found then
    raise exception 'Question template does not belong to this user and topic.'
      using errcode = '23503';
  end if;

  new.question_text_snapshot := template_question_text;
  return new;
end;
$$;

create trigger topics_set_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

create trigger question_templates_set_updated_at
before update on public.question_templates
for each row execute function public.set_updated_at();

create trigger question_template_positions_set_updated_at
before update on public.question_template_positions
for each row execute function public.set_updated_at();

create trigger readings_set_updated_at
before update on public.readings
for each row execute function public.set_updated_at();

create trigger reading_cards_set_updated_at
before update on public.reading_cards
for each row execute function public.set_updated_at();

create trigger readings_set_question_snapshot
before insert or update of question_template_id, topic_id, question_text_snapshot, status
on public.readings
for each row execute function public.set_reading_question_snapshot();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_reading_question_snapshot() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Query indexes
-- ---------------------------------------------------------------------------

create index topics_active_list_idx
  on public.topics (user_id, is_pinned desc, updated_at desc)
  where archived_at is null;

create index question_templates_active_list_idx
  on public.question_templates (user_id, topic_id, is_pinned desc, updated_at desc)
  where is_active;

create index question_template_positions_template_idx
  on public.question_template_positions (user_id, question_template_id, position_order);

create index readings_topic_timeline_idx
  on public.readings (user_id, topic_id, reading_at desc)
  where status = 'completed';

create index readings_question_timeline_idx
  on public.readings (user_id, question_template_id, reading_at desc)
  where status = 'completed' and question_template_id is not null;

create index readings_drafts_idx
  on public.readings (user_id, updated_at desc)
  where status = 'draft';

create index readings_favorites_idx
  on public.readings (user_id, reading_at desc)
  where is_favorite and status = 'completed';

create index reading_cards_analysis_idx
  on public.reading_cards (user_id, tarot_card_id, reading_id)
  where tarot_card_id is not null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tarot_cards enable row level security;
alter table public.topics enable row level security;
alter table public.question_templates enable row level security;
alter table public.question_template_positions enable row level security;
alter table public.readings enable row level security;
alter table public.reading_cards enable row level security;

create policy tarot_cards_select_authenticated
on public.tarot_cards
for select
to authenticated
using (true);

create policy topics_select_own
on public.topics
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy topics_insert_own
on public.topics
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy topics_update_own
on public.topics
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy topics_delete_own
on public.topics
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy question_templates_select_own
on public.question_templates
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy question_templates_insert_own
on public.question_templates
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy question_templates_update_own
on public.question_templates
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy question_templates_delete_own
on public.question_templates
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy question_template_positions_select_own
on public.question_template_positions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy question_template_positions_insert_own
on public.question_template_positions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy question_template_positions_update_own
on public.question_template_positions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy question_template_positions_delete_own
on public.question_template_positions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy readings_select_own
on public.readings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy readings_insert_own
on public.readings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy readings_update_own
on public.readings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy readings_delete_own
on public.readings
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy reading_cards_select_own
on public.reading_cards
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy reading_cards_insert_own
on public.reading_cards
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy reading_cards_update_own
on public.reading_cards
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy reading_cards_delete_own
on public.reading_cards
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Explicit Data API privileges. RLS still filters every granted operation.
revoke all on schema public from anon, authenticated;
grant usage on schema public to authenticated;

revoke all privileges on table public.tarot_cards from anon, authenticated;
revoke all privileges on table public.topics from anon, authenticated;
revoke all privileges on table public.question_templates from anon, authenticated;
revoke all privileges on table public.question_template_positions from anon, authenticated;
revoke all privileges on table public.readings from anon, authenticated;
revoke all privileges on table public.reading_cards from anon, authenticated;

grant select on table public.tarot_cards to authenticated;
grant select, insert, update, delete on table public.topics to authenticated;
grant select, insert, update, delete on table public.question_templates to authenticated;
grant select, insert, update, delete on table public.question_template_positions to authenticated;
grant select, insert, update, delete on table public.readings to authenticated;
grant select, insert, update, delete on table public.reading_cards to authenticated;

commit;
