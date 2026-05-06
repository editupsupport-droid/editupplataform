create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  editor_id uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  client_contact text not null,
  video_type text not null,
  duration text not null,
  level text not null,
  extras jsonb not null default '{}'::jsonb,
  total_price integer not null,
  deadline text not null,
  status text not null default 'pendente',
  form_answers jsonb not null default '{}'::jsonb,
  pricing_breakdown jsonb not null default '{}'::jsonb,
  calculated_price integer,
  manual_adjustment integer not null default 0,
  editor_message text not null default '',
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists quote_requests_editor_id_created_at_idx
on public.quote_requests (editor_id, created_at desc);

create index if not exists quote_requests_editor_status_created_idx
on public.quote_requests (editor_id, status, created_at desc);

alter table public.quote_requests enable row level security;

drop policy if exists "quote_requests_select_own" on public.quote_requests;
create policy "quote_requests_select_own"
on public.quote_requests for select
using (editor_id = auth.uid());

drop policy if exists "quote_requests_insert_public" on public.quote_requests;
create policy "quote_requests_insert_public"
on public.quote_requests for insert
with check (true);
