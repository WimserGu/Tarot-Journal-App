-- Prompt 20: scheduled and completed reflections attached to historical Readings.
-- No AI, notification scheduler, background task, or statistics aggregation is added.

create table public.reading_follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reading_id uuid not null references public.readings(id) on delete cascade,
  scheduled_for timestamptz not null,
  reviewed_at timestamptz,
  status text not null default 'scheduled',
  outcome text,
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_follow_ups_status_check
    check (status in ('scheduled', 'completed')),
  constraint reading_follow_ups_outcome_check
    check (
      outcome is null or outcome in (
        'happened',
        'partly_happened',
        'did_not_happen',
        'still_unclear'
      )
    ),
  constraint reading_follow_ups_state_check
    check (
      (status = 'scheduled' and reviewed_at is null and outcome is null)
      or
      (status = 'completed' and reviewed_at is not null and outcome is not null)
    ),
  constraint reading_follow_ups_reflection_check
    check (reflection is null or length(reflection) <= 5000)
);

create index reading_follow_ups_user_status_schedule_idx
  on public.reading_follow_ups (user_id, status, scheduled_for);

create index reading_follow_ups_reading_idx
  on public.reading_follow_ups (reading_id);

create unique index reading_follow_ups_pending_schedule_unique_idx
  on public.reading_follow_ups (reading_id, scheduled_for)
  where status = 'scheduled';

create trigger reading_follow_ups_set_updated_at
before update on public.reading_follow_ups
for each row execute function public.set_updated_at();

alter table public.reading_follow_ups enable row level security;

create policy reading_follow_ups_select_own on public.reading_follow_ups
for select to authenticated
using ((select auth.uid()) = user_id);

create policy reading_follow_ups_insert_own on public.reading_follow_ups
for insert to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.readings
    where readings.id = reading_follow_ups.reading_id
      and readings.user_id = (select auth.uid())
  )
);

create policy reading_follow_ups_update_own on public.reading_follow_ups
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.readings
    where readings.id = reading_follow_ups.reading_id
      and readings.user_id = (select auth.uid())
  )
);

create policy reading_follow_ups_delete_own on public.reading_follow_ups
for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all privileges on table public.reading_follow_ups from anon, authenticated;
grant select, insert, update, delete on table public.reading_follow_ups to authenticated;
