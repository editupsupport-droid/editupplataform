alter table public.profiles
  add column if not exists monthly_revenue_goal numeric(12, 2) default 5000,
  add column if not exists app_language text default 'pt',
  add column if not exists appearance_theme jsonb;

alter table public.profiles
  add constraint profiles_app_language_check
  check (app_language in ('pt', 'en', 'es'))
  not valid;

alter table public.profiles validate constraint profiles_app_language_check;
