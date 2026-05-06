alter table public.profiles
  add column if not exists quote_form_config jsonb;

alter table public.quote_requests
  add column if not exists status text not null default 'pendente',
  add column if not exists form_answers jsonb not null default '{}'::jsonb,
  add column if not exists pricing_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists calculated_price integer,
  add column if not exists manual_adjustment integer not null default 0,
  add column if not exists editor_message text not null default '',
  add column if not exists finalized_at timestamptz;

create index if not exists quote_requests_editor_status_created_idx
on public.quote_requests (editor_id, status, created_at desc);

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

create index if not exists quote_presets_editor_created_idx
on public.quote_presets (editor_id, created_at desc);
