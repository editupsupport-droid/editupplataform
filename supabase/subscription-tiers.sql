alter table public.profiles
  add column if not exists subscription_tier text not null default 'starter',
  add column if not exists subscription_status text not null default 'none',
  add column if not exists creative_cloud_redeem_available_until timestamptz;

update public.profiles
set subscription_tier = case
  when plan = 'pro' then 'pro'
  when plan = 'essential' then 'essential'
  else 'starter'
end
where subscription_tier is null or subscription_tier = '';

