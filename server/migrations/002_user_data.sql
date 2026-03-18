-- Watchlist: supports both asset and subgroup pins
create table if not exists user_watchlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('asset', 'subgroup')),
  target_id  text not null,
  pinned_at  timestamptz default now(),
  unique(user_id, type, target_id)
);

alter table user_watchlists enable row level security;

create policy "users manage own watchlist"
  on user_watchlists
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_watchlist_user_id
  on user_watchlists(user_id);

-- Preferences: one row per user, JSONB for flexibility
create table if not exists user_preferences (
  user_id    uuid primary key
             references auth.users(id) on delete cascade,
  prefs      jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table user_preferences enable row level security;

create policy "users manage own preferences"
  on user_preferences
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
