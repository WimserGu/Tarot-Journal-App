-- Prompt 16: per-user onboarding completion state. Deploy manually after review.
create table public.user_preferences (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_owner_check check (user_id = auth.uid())
);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

create policy user_preferences_select_own on public.user_preferences
for select to authenticated
using ((select auth.uid()) = user_id);

create policy user_preferences_insert_own on public.user_preferences
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy user_preferences_update_own on public.user_preferences
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all privileges on table public.user_preferences from anon, authenticated;
grant select, insert, update on table public.user_preferences to authenticated;
