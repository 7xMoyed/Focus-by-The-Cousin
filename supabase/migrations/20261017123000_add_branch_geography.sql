create extension if not exists postgis with schema extensions;

-- Existing projects may already have PostGIS installed in `public`, while new
-- projects install it in `extensions`. Resolve the type and functions through
-- both schemas so the migration stays additive in either environment.
set search_path = public, extensions;

-- `location` is the existing canonical PostGIS point. Expose generated numeric
-- coordinates for the public API without duplicating or desynchronizing data.
alter table public.venue_branches
  add column if not exists latitude double precision
    generated always as (
      case when location is null then null else st_y(location::geometry) end
    ) stored,
  add column if not exists longitude double precision
    generated always as (
      case when location is null then null else st_x(location::geometry) end
    ) stored;

-- Older publishing code stored the reviewed coordinates on the candidate but
-- did not copy them to the public branch. Backfill only missing branch points.
update public.venue_branches as branch
set location = st_setsrid(st_makepoint(candidate.longitude, candidate.latitude), 4326)::geography
from public.venue_candidates as candidate
where candidate.published_branch_id = branch.id
  and branch.location is null
  and candidate.latitude is not null
  and candidate.longitude is not null;

create index if not exists venue_branches_location_gist_idx
  on public.venue_branches using gist (location)
  where is_published = true and location is not null;

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
    st_distance(
      branch.location,
      st_setsrid(
        st_makepoint(search_longitude, search_latitude),
        4326
      )::geography
    ) as distance_meters
  from public.venue_branches as branch
  where branch.is_published = true
    and branch.location is not null
    and search_latitude between -90 and 90
    and search_longitude between -180 and 180
    and st_dwithin(
      branch.location,
      st_setsrid(
        st_makepoint(search_longitude, search_latitude),
        4326
      )::geography,
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

comment on column public.venue_branches.latitude is
  'Generated latitude derived from the canonical venue location.';

comment on column public.venue_branches.longitude is
  'Generated longitude derived from the canonical venue location.';

comment on function public.find_published_branches_nearby(
  double precision,
  double precision,
  integer,
  integer
) is 'Returns published venue branches within a bounded radius without persisting visitor coordinates.';
