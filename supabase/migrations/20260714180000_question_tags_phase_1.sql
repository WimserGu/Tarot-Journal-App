-- Phase 1: user-managed question tags scoped to one Topic.
create table public.question_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_tags_topic_user_fkey
    foreign key (topic_id,user_id) references public.topics(id,user_id) on delete cascade,
  constraint question_tags_id_topic_user_key unique (id,topic_id,user_id),
  constraint question_tags_topic_normalized_key unique (user_id,topic_id,normalized_name)
);

create index question_tags_user_topic_name_idx
  on public.question_tags(user_id,topic_id,name);

create trigger question_tags_set_updated_at
before update on public.question_tags
for each row execute function public.set_updated_at();

alter table public.question_tags enable row level security;

create policy question_tags_select_own on public.question_tags
  for select to authenticated using ((select auth.uid())=user_id);
create policy question_tags_insert_own on public.question_tags
  for insert to authenticated with check (
    (select auth.uid())=user_id
    and exists (
      select 1 from public.topics
      where topics.id=question_tags.topic_id
        and topics.user_id=(select auth.uid())
        and topics.archived_at is null
    )
  );
create policy question_tags_update_own on public.question_tags
  for update to authenticated
  using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id);
create policy question_tags_delete_own on public.question_tags
  for delete to authenticated using ((select auth.uid())=user_id);

grant select,insert,update,delete on public.question_tags to authenticated;
revoke all on public.question_tags from anon;

alter table public.readings add column question_tag_id uuid;
alter table public.readings add constraint readings_question_tag_topic_user_fkey
  foreign key (question_tag_id,topic_id,user_id)
  references public.question_tags(id,topic_id,user_id)
  on delete set null (question_tag_id);
create index readings_user_topic_question_tag_idx
  on public.readings(user_id,topic_id,question_tag_id)
  where question_tag_id is not null;

drop function public.create_reading_with_cards(uuid,uuid,text,timestamptz,text,text,text,text,jsonb);
drop function public.update_reading_with_cards(uuid,uuid,uuid,text,timestamptz,text,text,text,text,jsonb);

create function public.create_reading_with_cards(
  p_topic_id uuid,
  p_question_template_id uuid,
  p_question_tag_id uuid,
  p_temporary_question text,
  p_reading_at timestamptz,
  p_reading_timezone text,
  p_interpretation text,
  p_status text,
  p_spread_id text,
  p_cards jsonb
) returns uuid language plpgsql security invoker set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid();v_id uuid;v_question text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.topics where id=p_topic_id and user_id=v_user and archived_at is null) then raise exception 'topic unavailable' using errcode='42501'; end if;
  if p_question_tag_id is not null and not exists(select 1 from public.question_tags where id=p_question_tag_id and topic_id=p_topic_id and user_id=v_user) then raise exception 'question tag unavailable' using errcode='42501'; end if;
  if p_question_template_id is not null then select question_text into v_question from public.question_templates where id=p_question_template_id and topic_id=p_topic_id and user_id=v_user; if v_question is null then raise exception 'template unavailable' using errcode='42501'; end if; else v_question:=nullif(btrim(p_temporary_question),''); end if;
  if p_status not in ('draft','completed') or (p_status='completed' and v_question is null) then raise exception 'invalid reading' using errcode='22023'; end if;
  perform public.validate_reading_cards(p_cards,p_status,p_spread_id);
  insert into public.readings(user_id,topic_id,question_template_id,question_tag_id,question_text_snapshot,reading_at,reading_timezone,interpretation,status,spread_id)
  values(v_user,p_topic_id,p_question_template_id,p_question_tag_id,v_question,p_reading_at,p_reading_timezone,p_interpretation,p_status,p_spread_id) returning id into v_id;
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation,source,draw_session_id,reversal_expression,spread_position_id)
  select v_user,v_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation',coalesce(c->>'source','manual'),(c->>'draw_session_id')::uuid,c->>'reversal_expression',c->>'spread_position_id' from jsonb_array_elements(p_cards)c;
  return v_id;
end $$;

create function public.update_reading_with_cards(
  p_reading_id uuid,
  p_topic_id uuid,
  p_question_template_id uuid,
  p_question_tag_id uuid,
  p_temporary_question text,
  p_reading_at timestamptz,
  p_reading_timezone text,
  p_interpretation text,
  p_status text,
  p_spread_id text,
  p_cards jsonb
) returns uuid language plpgsql security invoker set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid();v_question text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.readings where id=p_reading_id and user_id=v_user for update) then raise exception 'reading unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.topics where id=p_topic_id and user_id=v_user and archived_at is null) then raise exception 'topic unavailable' using errcode='42501'; end if;
  if p_question_tag_id is not null and not exists(select 1 from public.question_tags where id=p_question_tag_id and topic_id=p_topic_id and user_id=v_user) then raise exception 'question tag unavailable' using errcode='42501'; end if;
  if p_question_template_id is not null then select question_text into v_question from public.question_templates where id=p_question_template_id and topic_id=p_topic_id and user_id=v_user; if v_question is null then raise exception 'template unavailable' using errcode='42501'; end if; else v_question:=nullif(btrim(p_temporary_question),''); end if;
  perform public.validate_reading_cards(p_cards,p_status,p_spread_id);
  update public.readings set topic_id=p_topic_id,question_template_id=p_question_template_id,question_tag_id=p_question_tag_id,question_text_snapshot=v_question,reading_at=p_reading_at,reading_timezone=p_reading_timezone,interpretation=p_interpretation,status=p_status,spread_id=p_spread_id where id=p_reading_id and user_id=v_user;
  delete from public.reading_cards where reading_id=p_reading_id and user_id=v_user;
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation,source,draw_session_id,reversal_expression,spread_position_id)
  select v_user,p_reading_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation',coalesce(c->>'source','manual'),(c->>'draw_session_id')::uuid,c->>'reversal_expression',c->>'spread_position_id' from jsonb_array_elements(p_cards)c;
  return p_reading_id;
end $$;

revoke all on function public.create_reading_with_cards(uuid,uuid,uuid,text,timestamptz,text,text,text,text,jsonb) from public,anon;
revoke all on function public.update_reading_with_cards(uuid,uuid,uuid,uuid,text,timestamptz,text,text,text,text,jsonb) from public,anon;
grant execute on function public.create_reading_with_cards(uuid,uuid,uuid,text,timestamptz,text,text,text,text,jsonb) to authenticated;
grant execute on function public.update_reading_with_cards(uuid,uuid,uuid,uuid,text,timestamptz,text,text,text,text,jsonb) to authenticated;

comment on table public.question_tags is 'User-managed question categories scoped to one Topic.';
comment on column public.readings.question_tag_id is 'Optional Topic-scoped question tag; null means unclassified.';
