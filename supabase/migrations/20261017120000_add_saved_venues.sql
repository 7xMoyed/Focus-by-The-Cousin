create table if not exists public.saved_venues (
  user_id uuid not null references auth.users (id) on delete cascade,
  branch_id uuid not null references public.venue_branches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

create index if not exists saved_venues_user_created_at_idx
  on public.saved_venues (user_id, created_at desc);

alter table public.saved_venues enable row level security;

revoke all on table public.saved_venues from anon, authenticated;
grant select, insert, delete on table public.saved_venues to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_venues'
      and policyname = 'saved_venues_select_own'
  ) then
    create policy "saved_venues_select_own"
      on public.saved_venues for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_venues'
      and policyname = 'saved_venues_insert_own'
  ) then
    create policy "saved_venues_insert_own"
      on public.saved_venues for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_venues'
      and policyname = 'saved_venues_delete_own'
  ) then
    create policy "saved_venues_delete_own"
      on public.saved_venues for delete to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end;
$$;

comment on table public.saved_venues is
  'User-owned Focus saves. Anonymous saves remain device-local and merge after sign-in; no IP identity is stored.';
