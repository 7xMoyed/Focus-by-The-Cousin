alter table public.profiles
  add column if not exists preferred_priorities text[] not null default '{}',
  add column if not exists preferred_city text,
  add column if not exists preferred_session_type text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.profiles
    add constraint profiles_preferred_priorities_valid
    check (
      cardinality(preferred_priorities) <= 3
      and preferred_priorities <@ array[
        'quiet', 'outlets', 'wifi', 'comfort', 'parking',
        'budget', 'long-stay', 'coffee', 'food', 'restrooms'
      ]::text[]
    ) not valid;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.profiles
    add constraint profiles_preferred_city_valid
    check (preferred_city is null or preferred_city in ('riyadh', 'majmaah')) not valid;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.profiles
    add constraint profiles_preferred_session_type_valid
    check (
      preferred_session_type is null
      or preferred_session_type in ('deep-focus', 'group-study', 'remote-work', 'quick-study')
    ) not valid;
exception when duplicate_object then null;
end;
$$;

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
  discovery_session_id uuid;
  requested_session_id text;
  focus_priorities text[] := '{}';
begin
  requested_username := lower(btrim(new.raw_user_meta_data ->> 'username'));
  requested_language := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'ar');
  discovery_answers := new.raw_user_meta_data -> 'discovery_answers';
  requested_session_id := new.raw_user_meta_data ->> 'discovery_session_id';

  if requested_username is null or requested_username !~ '^[a-z0-9._]{3,20}$' then
    raise exception 'invalid_username' using errcode = '23514';
  end if;

  if requested_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    discovery_session_id := requested_session_id::uuid;
  end if;

  if public.is_valid_focus_discovery_answers(discovery_answers) then
    select coalesce(array_agg(value), '{}')
    into focus_priorities
    from jsonb_array_elements_text(discovery_answers -> 'priorities') selected(value);
  end if;

  insert into public.profiles (
    id,
    username,
    preferred_language,
    preferred_priorities,
    preferred_city,
    preferred_session_type,
    onboarding_completed_at
  )
  values (
    new.id,
    requested_username,
    case when requested_language in ('ar', 'en') then requested_language else 'ar' end,
    focus_priorities,
    case when discovery_answers ->> 'city' in ('riyadh', 'majmaah')
      then discovery_answers ->> 'city' end,
    case when discovery_answers ->> 'sessionType' in (
      'deep-focus', 'group-study', 'remote-work', 'quick-study'
    ) then discovery_answers ->> 'sessionType' end,
    case when public.is_valid_focus_discovery_answers(discovery_answers) then now() end
  );

  if public.is_valid_focus_discovery_answers(discovery_answers) then
    insert into public.discovery_sessions (
      user_id,
      client_session_id,
      answers,
      preferred_language
    )
    values (
      new.id,
      discovery_session_id,
      discovery_answers,
      case when requested_language in ('ar', 'en') then requested_language else 'ar' end
    );
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_focus_user() from public;
