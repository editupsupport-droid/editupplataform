alter table public.board_cards
add column if not exists approval_token_hash text,
add column if not exists approval_expires_at timestamptz;

create index if not exists idx_board_cards_approval_expires_at
on public.board_cards (approval_expires_at);
