-- Prompt 21: unify App-drawn and manually entered cards on reading_cards.
-- DrawSession remains an application-only transient object; its UUID is retained
-- only as provenance on a saved drawn card and has no database parent table.

alter table public.reading_cards
  add column source text not null default 'manual',
  add column draw_session_id uuid,
  add column reversal_expression text;

alter table public.reading_cards
  add constraint reading_cards_source_check
    check (source in ('drawn', 'manual')),
  add constraint reading_cards_reversal_expression_check
    check (
      reversal_expression is null
      or reversal_expression in ('underexpressed', 'overexpressed')
    ),
  add constraint reading_cards_orientation_expression_check
    check (orientation = 'reversed' or reversal_expression is null),
  add constraint reading_cards_source_session_check
    check (
      (source = 'manual' and draw_session_id is null)
      or (source = 'drawn' and draw_session_id is not null)
    );

comment on column public.reading_cards.source is
  'manual for physical-card entry; drawn for cards produced by the in-app DrawEngine.';
comment on column public.reading_cards.draw_session_id is
  'Transient DrawSession provenance only; intentionally has no foreign key or parent table.';
comment on column public.reading_cards.reversal_expression is
  'Optional underexpressed/overexpressed observation for reversed cards; not a value judgment.';

create index reading_cards_draw_session_idx
  on public.reading_cards (user_id, draw_session_id)
  where draw_session_id is not null;

create or replace function public.validate_reading_cards(p_cards jsonb, p_status text)
returns void language plpgsql immutable security invoker set search_path = pg_catalog, public
as $$
begin
  if jsonb_typeof(p_cards)<>'array' or jsonb_array_length(p_cards)=0 then raise exception 'cards must be a non-empty array' using errcode='22023'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_cards) c
    where (c->>'position_order') is null
      or (c->>'position_order')::integer < 1
      or c->>'orientation' not in ('upright','reversed')
      or coalesce(c->>'source','manual') not in ('drawn','manual')
      or (c->>'reversal_expression' is not null and c->>'reversal_expression' not in ('underexpressed','overexpressed'))
      or (c->>'orientation' = 'upright' and c->>'reversal_expression' is not null)
      or (coalesce(c->>'source','manual') = 'manual' and c->>'draw_session_id' is not null)
      or (coalesce(c->>'source','manual') = 'drawn' and c->>'draw_session_id' is null)
  ) then raise exception 'invalid cards' using errcode='22023'; end if;
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
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation,source,draw_session_id,reversal_expression)
  select v_user,v_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation',coalesce(c->>'source','manual'),(c->>'draw_session_id')::uuid,c->>'reversal_expression' from jsonb_array_elements(p_cards)c;
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
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation,source,draw_session_id,reversal_expression)
  select v_user,p_reading_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation',coalesce(c->>'source','manual'),(c->>'draw_session_id')::uuid,c->>'reversal_expression' from jsonb_array_elements(p_cards)c;
  return p_reading_id;
end $$;

revoke all on function public.validate_reading_cards(jsonb,text) from public, anon;
revoke all on function public.create_reading_with_cards(uuid,uuid,text,timestamptz,text,text,text,jsonb) from public, anon;
revoke all on function public.update_reading_with_cards(uuid,uuid,uuid,text,timestamptz,text,text,text,jsonb) from public, anon;
grant execute on function public.validate_reading_cards(jsonb,text) to authenticated;
grant execute on function public.create_reading_with_cards(uuid,uuid,text,timestamptz,text,text,text,jsonb) to authenticated;
grant execute on function public.update_reading_with_cards(uuid,uuid,uuid,text,timestamptz,text,text,text,jsonb) to authenticated;
