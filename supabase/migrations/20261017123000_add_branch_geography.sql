create extension if not exists postgis with schema extensions;

alter table public.venue_branches
  add column if not exists focus_location extensions.geography(point, 4326)
  generated always as (
    case
      when latitude is null or longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    end
  ) stored;

create index if not exists venue_branches_focus_location_gist_idx
  on public.venue_branches using gist (focus_location)
  where is_published = true and focus_location is not null;

create or replace function public.find_published_branches_nearby(
  search_latitude double precision,
  search_longitude double precision,
  search_radius_meters integer default 20000,
  result_limit integer default 50
)
returns table (
  branch_id uuid,
  distance_meters double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    branch.id as branch_id,
    extensions.st_distance(
      branch.focus_location,
      extensions.st_setsrid(
        extensions.st_makepoint(search_longitude, search_latitude),
        4326
      )::extensions.geography
    ) as distance_meters
  from public.venue_branches as branch
  where branch.is_published = true
    and branch.focus_location is not null
    and search_latitude between -90 and 90
    and search_longitude between -180 and 180
    and extensions.st_dwithin(
      branch.focus_location,
      extensions.st_setsrid(
        extensions.st_makepoint(search_longitude, search_latitude),
        4326
      )::extensions.geography,
      greatest(0, least(search_radius_meters, 100000))
    )
  order by distance_meters
  limit greatest(1, least(result_limit, 50));
$$;

revoke all on function public.find_published_branches_nearby(
  double precision,
  double precision,
  integer,
  integer
) from public;

grant execute on function public.find_published_branches_nearby(
  double precision,
  double precision,
  integer,
  integer
) to anon, authenticated;

comment on column public.venue_branches.focus_location is
  'Generated PostGIS point used for proximity search; exact visitor coordinates are not stored here.';

comment on function public.find_published_branches_nearby(
  double precision,
  double precision,
  integer,
  integer
) is 'Returns published venue branches within a bounded radius without persisting visitor coordinates.';
