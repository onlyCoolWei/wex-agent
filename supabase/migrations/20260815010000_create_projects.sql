create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null references auth.users(id) on delete cascade,
  name text not null default '未命名项目',
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_id_created_at_idx
  on public.projects (owner_id, created_at desc);

alter table public.projects enable row level security;

comment on table public.projects is 'Top-level user projects managed by Wex Agent';
