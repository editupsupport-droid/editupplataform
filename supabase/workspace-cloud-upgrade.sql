alter table public.board_cards
add column if not exists client_id uuid references public.clients(id) on delete set null,
add column if not exists client_name text default '',
add column if not exists due_date timestamptz,
add column if not exists drive_link text default '',
add column if not exists approval_link text,
add column if not exists approval_token_hash text,
add column if not exists approval_expires_at timestamptz,
add column if not exists approved boolean,
add column if not exists client_feedback text default '',
add column if not exists client_status text not null default 'pendente',
add column if not exists notification_read boolean not null default true;

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  amount numeric(10,2) not null default 0,
  description text not null,
  category text not null,
  client_name text default '',
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric(10,2) not null default 0,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists finance_transactions_set_updated_at on public.finance_transactions;
create trigger finance_transactions_set_updated_at
before update on public.finance_transactions
for each row execute function public.handle_updated_at();

drop trigger if exists fixed_expenses_set_updated_at on public.fixed_expenses;
create trigger fixed_expenses_set_updated_at
before update on public.fixed_expenses
for each row execute function public.handle_updated_at();

alter table public.finance_transactions enable row level security;
alter table public.fixed_expenses enable row level security;

drop policy if exists "finance_transactions_own_all" on public.finance_transactions;
create policy "finance_transactions_own_all"
on public.finance_transactions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "fixed_expenses_own_all" on public.fixed_expenses;
create policy "fixed_expenses_own_all"
on public.fixed_expenses for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
