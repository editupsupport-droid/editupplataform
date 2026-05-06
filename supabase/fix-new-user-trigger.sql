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
  base_slug := regexp_replace(
    lower(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))),
    '[^a-z0-9]+',
    '-',
    'g'
  );
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
