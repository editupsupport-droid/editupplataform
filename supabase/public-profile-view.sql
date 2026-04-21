create or replace view public.public_profiles as
select
  slug,
  full_name,
  professional_title,
  bio,
  location,
  banner_url,
  video_url,
  edit_tools,
  video_styles,
  contact_method,
  contact_value
from public.profiles
where slug is not null and slug <> '';

grant select on public.public_profiles to anon, authenticated;
