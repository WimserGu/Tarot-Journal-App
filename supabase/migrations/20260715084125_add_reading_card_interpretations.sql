-- Persist an optional interpretation for each historical Reading card.
alter table public.reading_cards
  add column interpretation text,
  add constraint reading_cards_interpretation_check
    check (interpretation is null or char_length(interpretation) <= 5000);

comment on column public.reading_cards.interpretation is
  'Optional user-authored interpretation of this card in its Reading context.';

create or replace function public.validate_reading_cards(
  p_cards jsonb,
  p_status text,
  p_spread_id text
) returns void language plpgsql immutable security invoker set search_path=pg_catalog,public as $$
declare v_count integer;
begin
  if jsonb_typeof(p_cards)<>'array' then raise exception 'cards must be an array' using errcode='22023'; end if;
  v_count:=jsonb_array_length(p_cards);
  if v_count<1 or v_count>10 then raise exception 'cards must contain 1 to 10 positions' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_cards)c where
    (c->>'position_order') is null or (c->>'position_order')::integer<1
    or c->>'orientation' not in ('upright','reversed')
    or coalesce(c->>'source','manual') not in ('drawn','manual')
    or (c->>'reversal_expression' is not null and c->>'reversal_expression' not in ('underexpressed','overexpressed'))
    or (c->>'orientation'='upright' and c->>'reversal_expression' is not null)
    or (coalesce(c->>'source','manual')='manual' and c->>'draw_session_id' is not null)
    or (coalesce(c->>'source','manual')='drawn' and c->>'draw_session_id' is null)
    or char_length(coalesce(c->>'interpretation',''))>5000
  ) then raise exception 'invalid cards' using errcode='22023'; end if;
  if (select count(distinct (c->>'position_order')::integer) from jsonb_array_elements(p_cards)c)<>v_count
    or (select min((c->>'position_order')::integer) from jsonb_array_elements(p_cards)c)<>1
    or (select max((c->>'position_order')::integer) from jsonb_array_elements(p_cards)c)<>v_count
  then raise exception 'card order must be continuous' using errcode='22023'; end if;
  if p_status='completed' and exists(select 1 from jsonb_array_elements(p_cards)c where c->>'tarot_card_id' is null)
  then raise exception 'completed cards require tarot ids' using errcode='22023'; end if;
  if p_spread_id is null then
    if exists(select 1 from jsonb_array_elements(p_cards)c where c->>'spread_position_id' is not null)
    then raise exception 'legacy readings cannot contain spread positions' using errcode='22023'; end if;
  elsif p_spread_id='single-card' then
    if v_count<>1 or p_cards->0->>'spread_position_id'<>'single-card.reflection' then raise exception 'invalid single-card spread' using errcode='22023'; end if;
  elsif p_spread_id='three-cards' then
    if v_count<>3 or exists(select 1 from jsonb_array_elements(p_cards)c where c->>'spread_position_id'<>(array['three-cards.past','three-cards.present','three-cards.future'])[(c->>'position_order')::integer]) then raise exception 'invalid three-card spread' using errcode='22023'; end if;
  elsif p_spread_id='situation' then
    if v_count<>3 or exists(select 1 from jsonb_array_elements(p_cards)c where c->>'spread_position_id'<>(array['situation.situation','situation.challenge','situation.advice'])[(c->>'position_order')::integer]) then raise exception 'invalid situation spread' using errcode='22023'; end if;
  elsif p_spread_id='open' then
    if exists(select 1 from jsonb_array_elements(p_cards)c where c->>'spread_position_id'<>'open.card.'||(c->>'position_order')) then raise exception 'invalid open spread' using errcode='22023'; end if;
  else raise exception 'unknown spread' using errcode='22023';
  end if;
end $$;

create or replace function public.create_reading_with_cards(
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
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation,source,draw_session_id,reversal_expression,spread_position_id,interpretation)
  select v_user,v_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation',coalesce(c->>'source','manual'),(c->>'draw_session_id')::uuid,c->>'reversal_expression',c->>'spread_position_id',nullif(btrim(c->>'interpretation'),'') from jsonb_array_elements(p_cards)c;
  return v_id;
end $$;

create or replace function public.update_reading_with_cards(
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
  insert into public.reading_cards(user_id,reading_id,tarot_card_id,position_order,position_name,orientation,source,draw_session_id,reversal_expression,spread_position_id,interpretation)
  select v_user,p_reading_id,(c->>'tarot_card_id')::smallint,(c->>'position_order')::integer,nullif(btrim(c->>'position_name'),''),c->>'orientation',coalesce(c->>'source','manual'),(c->>'draw_session_id')::uuid,c->>'reversal_expression',c->>'spread_position_id',nullif(btrim(c->>'interpretation'),'') from jsonb_array_elements(p_cards)c;
  return p_reading_id;
end $$;
