alter table public.job_posts
add column if not exists status text not null default 'open';

drop policy if exists "job_posts_visible_to_authenticated" on public.job_posts;
drop policy if exists "job_posts_visible_to_starter_plus" on public.job_posts;
create policy "job_posts_visible_to_starter_plus"
on public.job_posts for select
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and plan in ('starter', 'essential')
  )
);

drop policy if exists "job_posts_update_own" on public.job_posts;
create policy "job_posts_update_own"
on public.job_posts for update
using (published_by = auth.uid())
with check (published_by = auth.uid());
