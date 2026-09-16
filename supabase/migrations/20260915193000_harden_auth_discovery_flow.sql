alter table public.discovery_sessions
  add column if not exists client_session_id uuid;

create unique index if not exists discovery_sessions_user_client_session_key
  on public.discovery_sessions (user_id, client_session_id)
  where client_session_id is not null;

create or replace function public.is_valid_focus_discovery_answers(payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  priority_count integer;
  distinct_priority_count integer;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    return false;
  end if;

  if payload ->> 'city' not in ('riyadh', 'majmaah')
    or payload ->> 'sessionType' not in (
      'deep-focus', 'group-study', 'remote-work', 'quick-study', 'light-study', 'online-class'
    )
    or payload ->> 'visitTime' not in (
      'now', 'morning', 'afternoon', 'evening', 'late-night'
    )
    or payload ->> 'locationChoice' not in (
      'near-me', 'university', 'north-riyadh', 'east-riyadh', 'central-riyadh',
      'west-riyadh', 'south-riyadh', 'area'
    )
    or payload ->> 'radius' not in ('5', '10', '20', 'reasonable')
    or jsonb_typeof(payload -> 'priorities') <> 'array'
    or jsonb_typeof(payload -> 'contextualAnswer') <> 'string'
    or char_length(payload ->> 'contextualAnswer') not between 1 and 100 then
    return false;
  end if;

  if payload ->> 'locationChoice' = 'area'
    and (
      jsonb_typeof(payload -> 'manualArea') <> 'string'
      or char_length(btrim(payload ->> 'manualArea')) not between 1 and 120
    ) then
    return false;
  end if;

  select count(*), count(distinct value)
  into priority_count, distinct_priority_count
  from jsonb_array_elements_text(payload -> 'priorities') as selected(value)
  where value in (
    'quiet', 'outlets', 'wifi', 'comfort', 'parking',
    'budget', 'long-stay', 'coffee', 'food', 'restrooms'
  );

  return priority_count between 1 and 3
    and distinct_priority_count = priority_count
    and priority_count = jsonb_array_length(payload -> 'priorities')
    and octet_length(payload::text) <= 8192;
exception
  when others then
    return false;
end;
$$;

revoke all on function public.is_valid_focus_discovery_answers(jsonb) from public;
grant execute on function public.is_valid_focus_discovery_answers(jsonb) to authenticated;

alter table public.discovery_sessions
  add constraint discovery_sessions_answers_valid
  check (public.is_valid_focus_discovery_answers(answers)) not valid;

grant insert on table public.profiles to authenticated;

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

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

  insert into public.profiles (id, username, preferred_language)
  values (
    new.id,
    requested_username,
    case when requested_language in ('ar', 'en') then requested_language else 'ar' end
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
