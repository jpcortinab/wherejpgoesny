# Art Agenda — cross-device sync

The website works without cloud sync: visits and monthly watchlists stay on this browser. **Sync / share** also offers a transfer link that imports a one-time snapshot on another device.

To enable **automatic private cloud sync**:

1. Create a Supabase project (or connect an existing project). This incurs any usage costs associated with your Supabase plan.
2. In the project's SQL editor, run the SQL below. The row-level security policies limit each user's data to their own authenticated account.
3. In Supabase **Authentication > URL Configuration**, set the site URL to `https://jpcortinab.github.io/wherejpgoesny/art/` and add that exact URL to allowed redirects. Enable the email provider for passwordless sign-in.
4. Edit `art/cloud-config.js` on GitHub and provide **only** the public Project URL and publishable/anon key. These are intended for browser use. **Never commit a service-role secret.**
5. Publish. Click **Sync / share** and request a sign-in email. Open that link on each device using the same email account.

```sql
create table if not exists public.art_tracker_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.art_tracker_state enable row level security;
revoke all on public.art_tracker_state from anon;
grant select, insert, update on public.art_tracker_state to authenticated;

create policy "Art owner can read" on public.art_tracker_state
  for select to authenticated using (auth.uid() = user_id);
create policy "Art owner can insert" on public.art_tracker_state
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Art owner can update" on public.art_tracker_state
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

The website currently uses last-write-wins synchronization on sign-in, local changes, and returning to the page. Before restoring cloud data it saves the previous local state as `jp-art-before-cloud-restore` in browser storage. For a portable backup, use **Save backup**. For a one-time transfer, use **Copy transfer link** (the link contains your list, so treat it as private).