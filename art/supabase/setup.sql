-- JP / NYC Art Index — private per-account state
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Never use a service-role key in the browser.
create table if not exists public.art_tracker_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.art_tracker_state enable row level security;
revoke all on public.art_tracker_state from anon;
revoke all on public.art_tracker_state from public;
grant select, insert, update on public.art_tracker_state to authenticated;

drop policy if exists "Art owner can read" on public.art_tracker_state;
drop policy if exists "Art owner can insert" on public.art_tracker_state;
drop policy if exists "Art owner can update" on public.art_tracker_state;

create policy "Art owner can read" on public.art_tracker_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Art owner can insert" on public.art_tracker_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Art owner can update" on public.art_tracker_state
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
