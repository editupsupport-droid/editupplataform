create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  professional_title text default 'Editor de vídeo',
  bio text default '',
  location text default '',
  slug text unique,
  banner_url text default '',
  video_url text default '',
  edit_tools text[] default '{}'::text[],
  video_styles text[] default '{}'::text[],
  contact_method text default 'email',
  contact_value text default '',
  plan text not null default 'free',
  subscription_tier text not null default 'starter',
  subscription_status text not null default 'none',
  creative_cloud_redeem_available_until timestamptz,
  can_publish_jobs boolean not null default false,
  quote_form_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null,
  format text not null,
  salary text not null,
  description text not null,
  contact text not null,
  status text not null default 'open',
  published_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  client_name text not null,
  status text not null default 'draft',
  amount numeric(10,2),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_presets (
  id uuid primary key default gen_random_uuid(),
  editor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  category_id text not null,
  add_on_ids jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  manual_adjustment integer not null default 0,
  client_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text default '',
  country_code text default '+55',
  edit_level text default 'simples',
  average_duration integer default 15,
  frequency text default '',
  drive_link text default '',
  drive_folder_id text,
  drive_folder_name text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  column_id text not null default 'entrada',
  position integer not null default 0,
  approval_token_hash text,
  approval_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists job_posts_set_updated_at on public.job_posts;
create trigger job_posts_set_updated_at
before update on public.job_posts
for each row execute function public.handle_updated_at();

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at
before update on public.proposals
for each row execute function public.handle_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.handle_updated_at();

drop trigger if exists board_cards_set_updated_at on public.board_cards;
create trigger board_cards_set_updated_at
before update on public.board_cards
for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  generated_slug text;
  suffix_counter integer := 1;
begin
  base_slug := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  if base_slug = '' then
    base_slug := split_part(new.email, '@', 1);
  end if;

  generated_slug := base_slug;

  while exists (
    select 1
    from public.profiles
    where slug = generated_slug
      and id <> new.id
  ) loop
    suffix_counter := suffix_counter + 1;
    generated_slug := concat(base_slug, '-', suffix_counter);
  end loop;

  insert into public.profiles (
    id,
    email,
    full_name,
    slug,
    contact_value,
    plan,
    can_publish_jobs
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    generated_slug,
    new.email,
    'free',
    new.email in ('muriloeditor2023@gmail.com', 'marinhojose1103@gmail.com')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    slug = excluded.slug,
    contact_value = excluded.contact_value,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.job_posts enable row level security;
alter table public.proposals enable row level security;
alter table public.clients enable row level security;
alter table public.board_cards enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "job_posts_visible_to_authenticated" on public.job_posts;
create policy "job_posts_visible_to_starter_plus"
on public.job_posts for select
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and plan in ('starter', 'essential')
  )
);

drop policy if exists "job_posts_publish_allowed" on public.job_posts;
create policy "job_posts_publish_allowed"
on public.job_posts for insert
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and can_publish_jobs = true
  )
);

drop policy if exists "job_posts_update_own" on public.job_posts;
create policy "job_posts_update_own"
on public.job_posts for update
using (published_by = auth.uid())
with check (published_by = auth.uid());

drop policy if exists "job_posts_delete_own" on public.job_posts;
create policy "job_posts_delete_own"
on public.job_posts for delete
using (published_by = auth.uid());

drop policy if exists "proposals_own_all" on public.proposals;
create policy "proposals_own_all"
on public.proposals for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "clients_own_all" on public.clients;
create policy "clients_own_all"
on public.clients for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "board_cards_own_all" on public.board_cards;
create policy "board_cards_own_all"
on public.board_cards for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
