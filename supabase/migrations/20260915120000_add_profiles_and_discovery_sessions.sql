create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9._]{3,20}$'),
  username_normalized text generated always as (lower(username)) stored,
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'en')),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_normalized_key
  on public.profiles (username_normalized);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table if not exists public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null check (
    jsonb_typeof(answers) = 'object'
    and octet_length(answers::text) <= 8192
  ),
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'en')),
  created_at timestamptz not null default now()
);

create index if not exists discovery_sessions_user_id_created_at_idx
  on public.discovery_sessions (user_id, created_at desc);

alter table public.discovery_sessions enable row level security;

revoke all on table public.discovery_sessions from anon, authenticated;
grant select, insert, update, delete on table public.discovery_sessions to authenticated;

create policy "discovery_sessions_select_own"
  on public.discovery_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "discovery_sessions_insert_own"
  on public.discovery_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "discovery_sessions_update_own"
  on public.discovery_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "discovery_sessions_delete_own"
  on public.discovery_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    lower(btrim(candidate)) ~ '^[a-z0-9._]{3,20}$'
    and not exists (
      select 1
      from public.profiles
      where username_normalized = lower(btrim(candidate))
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.handle_new_focus_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_language text;
  discovery_answers jsonb;
begin
  requested_username := btrim(new.raw_user_meta_data ->> 'username');
  requested_language := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'ar');
  discovery_answers := new.raw_user_meta_data -> 'discovery_answers';

  if requested_username is null or requested_username !~ '^[A-Za-z0-9._]{3,20}$' then
    return new;
  end if;

  insert into public.profiles (id, username, preferred_language)
  values (
    new.id,
    requested_username,
    case when requested_language in ('ar', 'en') then requested_language else 'ar' end
  );

  if jsonb_typeof(discovery_answers) = 'object'
    and octet_length(discovery_answers::text) <= 8192 then
    insert into public.discovery_sessions (user_id, answers, preferred_language)
    values (
      new.id,
      discovery_answers,
      case when requested_language in ('ar', 'en') then requested_language else 'ar' end
    );
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_focus_user() from public;

create trigger on_auth_user_created_focus_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_focus_user();
