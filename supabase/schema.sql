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
  can_publish_jobs boolean not null default false,
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
  generated_slug text;
begin
  generated_slug := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  generated_slug := trim(both '-' from generated_slug);

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
    case
      when generated_slug = '' then split_part(new.email, '@', 1)
      else generated_slug
    end,
    new.email,
    'free',
    new.email in ('muriloeditor2023@gmail.com', 'marinhojose1103@gmail.com')
  )
  on conflict (id) do nothing;

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

drop policy if exists "public_profile_visible" on public.profiles;
create policy "public_profile_visible"
on public.profiles for select
using (slug is not null);

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
