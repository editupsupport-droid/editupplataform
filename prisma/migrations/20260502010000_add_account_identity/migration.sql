alter table public.profiles
  add column if not exists account_name text,
  add column if not exists account_photo_url text;

update public.profiles
set account_name = coalesce(account_name, full_name)
where account_name is null;
