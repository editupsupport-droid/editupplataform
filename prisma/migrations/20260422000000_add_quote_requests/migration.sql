create table if not exists "quote_requests" (
  "id" uuid primary key default gen_random_uuid(),
  "editor_id" uuid not null references public.profiles(id) on delete cascade,
  "client_name" text not null,
  "client_contact" text not null,
  "video_type" text not null,
  "duration" text not null,
  "level" text not null,
  "extras" jsonb not null default '{}'::jsonb,
  "total_price" integer not null,
  "deadline" text not null,
  "created_at" timestamptz not null default now()
);

create index if not exists "quote_requests_editor_id_created_at_idx"
on "quote_requests" ("editor_id", "created_at" desc);
