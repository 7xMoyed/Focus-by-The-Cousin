-- Additive card fields: research proposals stay private until a founder confirms them.
-- Community Focus Score remains sourced only from approved Focus reviews.
alter table public.venue_candidates
  add column if not exists public_preliminary_rating numeric(3,1),
  add column if not exists public_preliminary_rating_approved boolean not null default false;

do $$
begin
  alter table public.venue_candidates
    add constraint venue_candidates_preliminary_rating_valid
    check (public_preliminary_rating is null or public_preliminary_rating between 1 and 10) not valid;
exception when duplicate_object then null;
end;
$$;

create table if not exists public.venue_candidate_facilities (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.venue_candidates(id) on delete cascade,
  facility_key text not null check (facility_key in (
    'coffee', 'food', 'seating', 'outlets', 'restrooms', 'wifi', 'quiet',
    'work_friendly', 'study_friendly', 'group_friendly', 'parking',
    'late_hours', 'outdoor_seating'
  )),
  proposed_state text not null default 'unknown' check (proposed_state in ('yes', 'no', 'unknown')),
  confirmed_state text not null default 'unknown' check (confirmed_state in ('yes', 'no', 'unknown')),
  evidence_summary text not null default '',
  source_url text,
  proposed_at timestamptz not null default now(),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(candidate_id, facility_key),
  check ((confirmed_at is null and confirmed_by is null) or confirmed_at is not null)
);

alter table public.venue_candidate_facilities enable row level security;
revoke all on public.venue_candidate_facilities from anon, authenticated;
grant select on public.venue_candidate_facilities to authenticated;

create policy "founders_select_candidate_facilities"
  on public.venue_candidate_facilities for select to authenticated
  using ((select public.is_focus_founder(auth.uid())));

-- WEE already had founder-approved public seating signals and supplied venue photos.
-- Preserve that one existing public fact in the new model; do not infer other facilities.
insert into public.venue_candidate_facilities (
  candidate_id, facility_key, proposed_state, confirmed_state,
  evidence_summary, source_url, confirmed_by, confirmed_at
)
select id, 'seating', 'yes', 'yes',
  'Founder-approved supplied photos show indoor seating and long work tables; the existing seating evidence is strong.',
  '/venues/wee/interior-wide.jpg', reviewed_by, coalesce(reviewed_at, now())
from public.venue_candidates
where research_key = 'wee-an-nakheel-riyadh'
on conflict (candidate_id, facility_key) do nothing;

create or replace function public.get_public_venue_enrichment(target_branch_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'googlePlaceId', c.google_place_id,
    'summaryAr', c.public_summary_ar,
    'summaryEn', c.public_summary_en,
    'bestFor', c.public_best_for,
    'signals', c.public_signals,
    'photoPositions', coalesce((
      select jsonb_agg(p.photo_position order by p.display_order, p.photo_position)
      from public.venue_candidate_photo_choices p
      where p.candidate_id = c.id and p.approved_for_display and not p.excluded
        and p.reviewed_at >= now() - interval '24 hours'
    ), '[]'::jsonb),
    'preliminaryRating', case
      when c.public_preliminary_rating_approved
        and c.public_preliminary_rating is not null
        and c.confidence in ('high', 'medium')
      then c.public_preliminary_rating
      else null
    end,
    'facilities', coalesce((
      select jsonb_object_agg(f.facility_key, f.confirmed_state order by f.facility_key)
      from public.venue_candidate_facilities f
      where f.candidate_id = c.id
        and f.confirmed_at is not null
        and f.confirmed_state in ('yes', 'no')
    ), '{}'::jsonb)
  )
  from public.venue_candidates c
  join public.venue_branches b on b.id = c.published_branch_id
  where b.id = target_branch_id and b.is_published
    and c.status = 'approved' and c.approved_for_publication
  limit 1;
$$;

revoke all on function public.get_public_venue_enrichment(uuid) from public;
grant execute on function public.get_public_venue_enrichment(uuid) to anon, authenticated;
