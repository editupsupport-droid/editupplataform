create table if not exists public.google_drive_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamptz,
  scope text not null default 'https://www.googleapis.com/auth/drive',
  drive_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients
add column if not exists drive_folder_id text,
add column if not exists drive_folder_name text default '';

create table if not exists public.approval_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.board_cards(id) on delete cascade,
  token text not null unique,
  file_id text,
  file_name text default '',
  file_url text default '',
  permission_id text,
  source_type text not null default 'manual',
  expires_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_links_user_status_expires_idx
on public.approval_links (user_id, status, expires_at);

create index if not exists approval_links_task_status_idx
on public.approval_links (task_id, status);

drop trigger if exists google_drive_connections_set_updated_at on public.google_drive_connections;
create trigger google_drive_connections_set_updated_at
before update on public.google_drive_connections
for each row execute function public.handle_updated_at();

drop trigger if exists approval_links_set_updated_at on public.approval_links;
create trigger approval_links_set_updated_at
before update on public.approval_links
for each row execute function public.handle_updated_at();

alter table public.google_drive_connections enable row level security;
alter table public.approval_links enable row level security;

drop policy if exists "google_drive_connections_own_all" on public.google_drive_connections;
create policy "google_drive_connections_own_all"
on public.google_drive_connections for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "approval_links_own_all" on public.approval_links;
create policy "approval_links_own_all"
on public.approval_links for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
