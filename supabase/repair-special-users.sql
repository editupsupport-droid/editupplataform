insert into public.profiles (
  id,
  email,
  full_name,
  slug,
  contact_value,
  plan,
  can_publish_jobs
)
select
  au.id,
  au.email,
  case
    when au.email = 'muriloeditor2023@gmail.com' then 'Murilo Editor'
    when au.email = 'marinhojose1103@gmail.com' then 'Marinho Jose'
    when au.email = 'euagoodream@gmail.com' then 'Eu Ago Dream'
    else coalesce(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))
  end as full_name,
  trim(
    both '-'
    from regexp_replace(
      lower(
        case
          when au.email = 'muriloeditor2023@gmail.com' then 'murilo-editor'
          when au.email = 'marinhojose1103@gmail.com' then 'marinho-jose'
          when au.email = 'euagoodream@gmail.com' then 'eu-ago-dream'
          else coalesce(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))
        end
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  ) as slug,
  au.email as contact_value,
  case
    when au.email in (
      'muriloeditor2023@gmail.com',
      'marinhojose1103@gmail.com',
      'euagoodream@gmail.com'
    ) then 'essential'
    else 'free'
  end as plan,
  case
    when au.email in (
      'muriloeditor2023@gmail.com',
      'marinhojose1103@gmail.com'
    ) then true
    else false
  end as can_publish_jobs
from auth.users au
where au.email in (
  'muriloeditor2023@gmail.com',
  'marinhojose1103@gmail.com',
  'euagoodream@gmail.com'
)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  slug = excluded.slug,
  contact_value = excluded.contact_value,
  plan = excluded.plan,
  can_publish_jobs = excluded.can_publish_jobs,
  updated_at = now();
