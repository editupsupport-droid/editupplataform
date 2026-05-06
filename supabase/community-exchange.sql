create table if not exists public.community_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default 'Editor',
  title text not null,
  description text not null default '',
  drive_folder_id text not null,
  drive_folder_name text not null default '',
  thumbnail_url text not null default '',
  thumbnail_position_x integer not null default 50,
  thumbnail_position_y integer not null default 50,
  thumbnail_zoom integer not null default 100,
  hashtags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_resources
add column if not exists thumbnail_position_x integer not null default 50,
add column if not exists thumbnail_position_y integer not null default 50,
add column if not exists thumbnail_zoom integer not null default 100;

create table if not exists public.community_resource_interactions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.community_resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_id, user_id)
);

alter table public.community_resource_interactions
drop constraint if exists community_resource_interactions_interaction_type_check;

update public.community_resource_interactions
set interaction_type = 'dislike'
where interaction_type = 'discuss';

alter table public.community_resource_interactions
add constraint community_resource_interactions_interaction_type_check
check (interaction_type in ('like', 'dislike'));

create table if not exists public.community_resource_comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.community_resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default 'Editor',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_resources_created_at_idx
on public.community_resources (created_at desc);

create index if not exists community_resources_hashtags_idx
on public.community_resources using gin (hashtags);

create index if not exists community_interactions_resource_idx
on public.community_resource_interactions (resource_id, interaction_type);

create index if not exists community_comments_resource_created_idx
on public.community_resource_comments (resource_id, created_at);

create or replace function public.set_community_resource_interaction(
  p_resource_id uuid,
  p_user_id uuid,
  p_interaction_type text
)
returns table (interaction_type text)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_interaction_type not in ('like', 'dislike') then
    raise exception 'invalid interaction_type' using errcode = '22023';
  end if;

  insert into public.community_resource_interactions (
    resource_id,
    user_id,
    interaction_type
  )
  values (
    p_resource_id,
    p_user_id,
    p_interaction_type
  )
  on conflict (resource_id, user_id)
  do update set
    interaction_type = excluded.interaction_type,
    updated_at = now()
  returning public.community_resource_interactions.interaction_type
  into interaction_type;

  return next;
end;
$$;

drop trigger if exists community_resources_set_updated_at on public.community_resources;
create trigger community_resources_set_updated_at
before update on public.community_resources
for each row execute function public.handle_updated_at();

drop trigger if exists community_interactions_set_updated_at on public.community_resource_interactions;
create trigger community_interactions_set_updated_at
before update on public.community_resource_interactions
for each row execute function public.handle_updated_at();

drop trigger if exists community_comments_set_updated_at on public.community_resource_comments;
create trigger community_comments_set_updated_at
before update on public.community_resource_comments
for each row execute function public.handle_updated_at();

alter table public.community_resources enable row level security;
alter table public.community_resource_interactions enable row level security;
alter table public.community_resource_comments enable row level security;

drop policy if exists "community_resources_read_all" on public.community_resources;
create policy "community_resources_read_all"
on public.community_resources for select
using (auth.uid() is not null);

drop policy if exists "community_resources_insert_own" on public.community_resources;
create policy "community_resources_insert_own"
on public.community_resources for insert
with check (user_id = auth.uid());

drop policy if exists "community_resources_update_own" on public.community_resources;
create policy "community_resources_update_own"
on public.community_resources for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "community_resources_delete_own_or_admin" on public.community_resources;
create policy "community_resources_delete_own_or_admin"
on public.community_resources for delete
using (
  user_id = auth.uid()
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'marinhojose1103@gmail.com'
);

drop policy if exists "community_interactions_read_all" on public.community_resource_interactions;
create policy "community_interactions_read_all"
on public.community_resource_interactions for select
using (auth.uid() is not null);

drop policy if exists "community_interactions_own_all" on public.community_resource_interactions;
create policy "community_interactions_own_all"
on public.community_resource_interactions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "community_comments_read_all" on public.community_resource_comments;
create policy "community_comments_read_all"
on public.community_resource_comments for select
using (auth.uid() is not null);

drop policy if exists "community_comments_insert_own" on public.community_resource_comments;
create policy "community_comments_insert_own"
on public.community_resource_comments for insert
with check (user_id = auth.uid());
