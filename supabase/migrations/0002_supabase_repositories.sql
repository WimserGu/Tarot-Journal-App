-- Prompt 15C: repository ordering and transactional write boundaries.
alter table public.question_templates add column display_order integer;

with ranked as (
  select id, row_number() over (partition by topic_id order by created_at, id)::integer as value
  from public.question_templates
)
update public.question_templates q set display_order = ranked.value from ranked where ranked.id = q.id;

alter table public.question_templates alter column display_order set not null;
alter table public.question_templates add constraint question_templates_display_order_check check (display_order >= 1);
alter table public.question_templates add constraint question_templates_topic_display_order_key unique (topic_id, display_order) deferrable initially deferred;
create index question_templates_topic_display_idx on public.question_templates (topic_id, display_order);

create or replace function public.list_topics_with_activity()
returns table (id uuid, user_id uuid, title text, description text, icon text, is_pinned boolean, archived_at timestamptz, created_at timestamptz, updated_at timestamptz, fixed_question_count bigint, record_count bigint, latest_activity_at timestamptz)
language sql security invoker set search_path = pg_catalog, public, auth
as $$
  select t.id, t.user_id, t.title, t.description, t.icon, t.is_pinned, t.archived_at, t.created_at, t.updated_at,
    count(distinct q.id), count(distinct r.id), greatest(t.updated_at, coalesce(max(r.updated_at), t.updated_at))
  from public.topics t
  left join public.question_templates q on q.topic_id=t.id and q.user_id=t.user_id
  left join public.readings r on r.topic_id=t.id and r.user_id=t.user_id
  where auth.uid() is not null and t.user_id=auth.uid() and t.archived_at is null
  group by t.id
  order by t.is_pinned desc, greatest(t.updated_at, coalesce(max(r.updated_at), t.updated_at)) desc;
$$;

create or replace function public.create_question_template(p_topic_id uuid, p_question_text text, p_frequency text, p_is_active boolean, p_is_pinned boolean, p_position_names text[])
returns uuid language plpgsql security invoker set search_path = pg_catalog, public, auth
as $$
declare v_user uuid := auth.uid(); v_id uuid; v_order integer;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.topics where id=p_topic_id and user_id=v_user and archived_at is null) then raise exception 'topic unavailable' using errcode='42501'; end if;
  if nullif(btrim(p_question_text),'') is null or p_frequency not in ('as_needed','daily','weekly') then raise exception 'invalid template' using errcode='22023'; end if;
  if p_position_names is null or exists(select 1 from unnest(p_position_names) n where nullif(btrim(n),'') is null or char_length(n)>120) then raise exception 'invalid positions' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_topic_id::text, 15));
  select coalesce(max(display_order),0)+1 into v_order from public.question_templates where topic_id=p_topic_id;
  insert into public.question_templates(user_id,topic_id,question_text,frequency,is_active,is_pinned,display_order)
  values(v_user,p_topic_id,btrim(p_question_text),p_frequency,p_is_active,p_is_pinned,v_order) returning id into v_id;
  insert into public.question_template_positions(user_id,question_template_id,position_order,position_name)
  select v_user,v_id,ordinality,btrim(name) from unnest(p_position_names) with ordinality p(name,ordinality);
  return v_id;
end $$;

create or replace function public.reorder_question_templates(p_topic_id uuid, p_template_ids uuid[])
returns void language plpgsql security invoker set search_path = pg_catalog, public, auth
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_template_ids is null or cardinality(p_template_ids)=0 or cardinality(p_template_ids)<>(select count(distinct x) from unnest(p_template_ids) x) then raise exception 'invalid template ids' using errcode='22023'; end if;
  if (select count(*) from public.question_templates where topic_id=p_topic_id and user_id=v_user)<>cardinality(p_template_ids)
    or exists(select 1 from unnest(p_template_ids) x where not exists(select 1 from public.question_templates q where q.id=x and q.topic_id=p_topic_id and q.user_id=v_user))
  then raise exception 'templates unavailable' using errcode='42501'; end if;
  set constraints question_templates_topic_display_order_key deferred;
  update public.question_templates q set display_order=v.ord, updated_at=now()
  from unnest(p_template_ids) with ordinality v(id,ord) where q.id=v.id and q.user_id=v_user;
end $$;

create or replace function public.update_question_template(p_template_id uuid, p_topic_id uuid, p_question_text text, p_frequency text, p_is_active boolean, p_is_pinned boolean, p_position_names text[])
returns uuid language plpgsql security invoker set search_path = pg_catalog, public, auth
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.question_templates where id=p_template_id and topic_id=p_topic_id and user_id=v_user for update) then raise exception 'template unavailable' using errcode='42501'; end if;
  if nullif(btrim(p_question_text),'') is null or p_frequency not in ('as_needed','daily','weekly') or p_position_names is null or exists(select 1 from unnest(p_position_names)n where nullif(btrim(n),'') is null or char_length(n)>120) then raise exception 'invalid template' using errcode='22023'; end if;
  update public.question_templates set question_text=btrim(p_question_text),frequency=p_frequency,is_active=p_is_active,is_pinned=p_is_pinned where id=p_template_id and user_id=v_user;
  delete from public.question_template_positions where question_template_id=p_template_id and user_id=v_user;
  insert into public.question_template_positions(user_id,question_template_id,position_order,position_name)
  select v_user,p_template_id,ordinality,btrim(name) from unnest(p_position_names) with ordinality p(name,ordinality);
  return p_template_id;
end $$;

create or replace function public.delete_question_template(p_template_id uuid)
returns void language plpgsql security invoker set search_path = pg_catalog, public, auth
as $$
declare v_user uuid:=auth.uid(); v_topic uuid;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  select topic_id into v_topic from public.question_templates where id=p_template_id and user_id=v_user for update;
  if v_topic is null then raise exception 'template unavailable' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_topic::text,15));
  delete from public.question_templates where id=p_template_id and user_id=v_user;
  set constraints question_templates_topic_display_order_key deferred;
  with ranked as (select id,row_number() over(order by display_order,id)::integer value from public.question_templates where topic_id=v_topic and user_id=v_user)
  update public.question_templates q set display_order=ranked.value from ranked where q.id=ranked.id;
end $$;

create or replace function public.validate_reading_cards(p_cards jsonb, p_status text)
returns void language plpgsql immutable security invoker set search_path = pg_catalog, public
as $$
begin
  if jsonb_typeof(p_cards)<>'array' or jsonb_array_length(p_cards)=0 then raise exception 'cards must be a non-empty array' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_cards) c where (c->>'position_order') is null or (c->>'position_order')::integer<1 or c->>'orientation' not in ('upright','reversed')) then raise exception 'invalid cards' using errcode='22023'; end if;
  if (select count(distinct (c->>'position_order')::integer) from jsonb_array_elements(p_cards)c)<>jsonb_array_length(p_cards)
    or (select min((c->>'position_order')::integer) from jsonb_array_elements(p_cards)c)<>1
    or (select max((c->>'position_order')::integer) from jsonb_array_elements(p_cards)c)<>jsonb_array_length(p_cards)
  then raise exception 'card order must be continuous' using errcode='22023'; end if;
  if p_status='completed' and exists(select 1 from jsonb_array_elements(p_cards)c where c->>'tarot_card_id' is null) then raise exception 'completed cards require tarot ids' using errcode='22023'; end if;
end $$;

create or replace function public.create_reading_with_cards(p_topic_id uuid, p_question_template_id uuid, p_temporary_question text, p_reading_at timestamptz, p_reading_timezone text, p_interpretation text, p_status text, p_cards jsonb)
returns uuid language plpgsql security invoker set search_path = pg_catalog, public, auth
as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_question text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.topics where id=p_topic_id and user_id=v_user and archived_at is null) then raise exception 'topic unavailable' using errcode='42501'; end if;
  if p_question_template_id is not null then select question_text into v_question from public.question_templates where id=p_question_template_id and topic_id=p_topic_id and user_id=v_user; if v_question is null then raise exception 'template unavailable' using errcode='42501'; end if; else v_question:=nullif(btrim(p_temporary_question),''); end if;
  if p_status not in ('draft','completed') or (p_status='completed' and v_question is null) then raise exception 'invalid reading' using errcode='22023'; end if;
  perform public.validate_reading_cards(p_cards,p_status);
  insert into public.readings(user_id,topic_id,question_template_id,question_text_snapshot,reading_at,reading_timezone,interpretation,status)
  values(v_user,p_topic_id,p_question_template_id,v_question,p_reading_at,p_reading_timezone,p_interpretation,p_status) returning id into v_id;
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation)
  select v_user,v_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation' from jsonb_array_elements(p_cards)c;
  return v_id;
end $$;

create or replace function public.update_reading_with_cards(p_reading_id uuid, p_topic_id uuid, p_question_template_id uuid, p_temporary_question text, p_reading_at timestamptz, p_reading_timezone text, p_interpretation text, p_status text, p_cards jsonb)
returns uuid language plpgsql security invoker set search_path = pg_catalog, public, auth
as $$
declare v_user uuid:=auth.uid(); v_question text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.readings where id=p_reading_id and user_id=v_user for update) then raise exception 'reading unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.topics where id=p_topic_id and user_id=v_user and archived_at is null) then raise exception 'topic unavailable' using errcode='42501'; end if;
  if p_question_template_id is not null then select question_text into v_question from public.question_templates where id=p_question_template_id and topic_id=p_topic_id and user_id=v_user; if v_question is null then raise exception 'template unavailable' using errcode='42501'; end if; else v_question:=nullif(btrim(p_temporary_question),''); end if;
  perform public.validate_reading_cards(p_cards,p_status);
  update public.readings set topic_id=p_topic_id,question_template_id=p_question_template_id,question_text_snapshot=v_question,reading_at=p_reading_at,reading_timezone=p_reading_timezone,interpretation=p_interpretation,status=p_status where id=p_reading_id and user_id=v_user;
  delete from public.reading_cards where reading_id=p_reading_id and user_id=v_user;
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation)
  select v_user,p_reading_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation' from jsonb_array_elements(p_cards)c;
  return p_reading_id;
end $$;

revoke all on function public.list_topics_with_activity() from public, anon;
revoke all on function public.create_question_template(uuid,text,text,boolean,boolean,text[]) from public, anon;
revoke all on function public.reorder_question_templates(uuid,uuid[]) from public, anon;
revoke all on function public.update_question_template(uuid,uuid,text,text,boolean,boolean,text[]) from public, anon;
revoke all on function public.delete_question_template(uuid) from public, anon;
revoke all on function public.validate_reading_cards(jsonb,text) from public, anon;
revoke all on function public.create_reading_with_cards(uuid,uuid,text,timestamptz,text,text,text,jsonb) from public, anon;
revoke all on function public.update_reading_with_cards(uuid,uuid,uuid,text,timestamptz,text,text,text,jsonb) from public, anon;
grant execute on function public.list_topics_with_activity() to authenticated;
grant execute on function public.create_question_template(uuid,text,text,boolean,boolean,text[]) to authenticated;
grant execute on function public.reorder_question_templates(uuid,uuid[]) to authenticated;
grant execute on function public.update_question_template(uuid,uuid,text,text,boolean,boolean,text[]) to authenticated;
grant execute on function public.delete_question_template(uuid) to authenticated;
grant execute on function public.validate_reading_cards(jsonb,text) to authenticated;
grant execute on function public.create_reading_with_cards(uuid,uuid,text,timestamptz,text,text,text,jsonb) to authenticated;
grant execute on function public.update_reading_with_cards(uuid,uuid,uuid,text,timestamptz,text,text,text,jsonb) to authenticated;
