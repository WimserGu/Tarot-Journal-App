-- Prompt 23: persistent, user-owned draw events, independent from Reading snapshots.
create table public.draw_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  spread_id text,
  configuration jsonb not null,
  status text not null default 'draft',
  linked_reading_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint draw_sessions_id_user_key unique (id, user_id),
  constraint draw_sessions_spread_id_check check (spread_id is null or spread_id in ('single-card','three-cards','situation','open')),
  constraint draw_sessions_status_check check (status in ('draft','saved','discarded')),
  constraint draw_sessions_configuration_check check (jsonb_typeof(configuration) = 'object')
);

create table public.draw_session_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  draw_session_id uuid not null,
  tarot_card_id smallint not null references public.tarot_cards(id) on delete restrict,
  position_index integer not null,
  spread_position_id text not null,
  position_snapshot text not null,
  orientation text not null,
  reversal_expression text,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint draw_session_cards_owner_fk foreign key (draw_session_id, user_id)
    references public.draw_sessions(id, user_id) on delete cascade,
  constraint draw_session_cards_position_check check (position_index >= 0),
  constraint draw_session_cards_position_key unique (draw_session_id, position_index),
  constraint draw_session_cards_snapshot_check check (char_length(btrim(position_snapshot)) between 1 and 120),
  constraint draw_session_cards_orientation_check check (orientation in ('upright','reversed')),
  constraint draw_session_cards_expression_check check (reversal_expression is null or reversal_expression in ('underexpressed','overexpressed')),
  constraint draw_session_cards_orientation_expression_check check (orientation = 'reversed' or reversal_expression is null),
  constraint draw_session_cards_source_check check (source in ('drawn','manual'))
);

create unique index draw_sessions_one_draft_per_user_idx on public.draw_sessions(user_id) where status = 'draft';
create index draw_sessions_history_idx on public.draw_sessions(user_id, created_at desc) where status <> 'discarded';
create index draw_session_cards_session_idx on public.draw_session_cards(user_id, draw_session_id, position_index);

create trigger draw_sessions_set_updated_at before update on public.draw_sessions
for each row execute function public.set_updated_at();
create trigger draw_session_cards_set_updated_at before update on public.draw_session_cards
for each row execute function public.set_updated_at();

create function public.enforce_draw_session_lifecycle()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if old.status = 'saved' then
    raise exception 'saved draw sessions are immutable' using errcode = '22023';
  end if;
  if old.status = 'discarded' then
    raise exception 'discarded draw sessions cannot be reopened' using errcode = '22023';
  end if;
  if new.status = 'saved' and new.linked_reading_id is null then
    raise exception 'saved draw sessions require a linked reading' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger draw_sessions_enforce_lifecycle before update on public.draw_sessions
for each row execute function public.enforce_draw_session_lifecycle();

alter table public.draw_sessions enable row level security;
alter table public.draw_session_cards enable row level security;

create policy draw_sessions_select_own on public.draw_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy draw_sessions_insert_own on public.draw_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy draw_sessions_update_own on public.draw_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy draw_sessions_delete_own on public.draw_sessions for delete to authenticated using ((select auth.uid()) = user_id);
create policy draw_session_cards_select_own on public.draw_session_cards for select to authenticated using ((select auth.uid()) = user_id);
create policy draw_session_cards_insert_own on public.draw_session_cards for insert to authenticated with check ((select auth.uid()) = user_id);
create policy draw_session_cards_update_own on public.draw_session_cards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy draw_session_cards_delete_own on public.draw_session_cards for delete to authenticated using ((select auth.uid()) = user_id);

revoke all privileges on table public.draw_sessions from anon, authenticated;
revoke all privileges on table public.draw_session_cards from anon, authenticated;
grant select, insert, update, delete on table public.draw_sessions to authenticated;
grant select, insert, update, delete on table public.draw_session_cards to authenticated;
revoke all on function public.enforce_draw_session_lifecycle() from public, anon, authenticated;
