-- Groups
create table if not exists groups (
  id           text primary key,
  display_name text not null,
  description  text,
  slug         text unique not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Subgroups
create table if not exists subgroups (
  id           text primary key,
  display_name text not null,
  description  text,
  slug         text unique not null,
  group_id     text not null references groups(id),
  icon         text,
  color        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_subgroups_group_id on subgroups(group_id);

-- Assets
create table if not exists assets (
  id          text primary key,
  symbol      text not null,
  name        text not null,
  subgroup_id text not null references subgroups(id),
  group_id    text not null references groups(id),
  type        text not null,
  currency    text,
  exchange    text,
  active      boolean default true,
  meta        jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_assets_subgroup_id on assets(subgroup_id);
create index if not exists idx_assets_group_id    on assets(group_id);

-- Users (auth handled by Supabase Auth in Phase 2;
-- this table holds role and profile data)
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  name       text not null default '',
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);
