-- Prompt 18: immutable-by-default weekly/monthly review snapshots.
-- Statistics remain application-layer pure functions; this table only persists snapshots.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  timezone text not null,
  status text not null,
  include_drafts boolean not null default false,
  statistics_snapshot jsonb not null,
  source_reading_ids uuid[] not null default '{}'::uuid[],
  source_fingerprint text not null,
  personal_summary text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_type_check check (review_type in ('weekly', 'monthly')),
  constraint reviews_status_check check (status in ('in_progress', 'completed')),
  constraint reviews_period_check check (period_end > period_start),
  constraint reviews_timezone_check check (length(btrim(timezone)) between 1 and 100),
  constraint reviews_snapshot_check check (jsonb_typeof(statistics_snapshot) = 'object'),
  constraint reviews_fingerprint_check check (length(source_fingerprint) between 1 and 200),
  constraint reviews_summary_check check (personal_summary is null or length(personal_summary) <= 5000),
  constraint reviews_period_unique unique (user_id, review_type, period_start, timezone)
);

create index reviews_user_period_idx
  on public.reviews (user_id, period_start desc);

create or replace function public.validate_review_timezone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.timezone
  ) then
    raise exception 'Invalid IANA timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger reviews_validate_timezone
before insert or update of timezone on public.reviews
for each row execute function public.validate_review_timezone();

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

create policy reviews_select_own on public.reviews
for select to authenticated
using ((select auth.uid()) = user_id);

create policy reviews_insert_own on public.reviews
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy reviews_update_own on public.reviews
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy reviews_delete_own on public.reviews
for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all privileges on table public.reviews from anon, authenticated;
grant select, insert, update, delete on table public.reviews to authenticated;

revoke all on function public.validate_review_timezone() from public, anon, authenticated;
