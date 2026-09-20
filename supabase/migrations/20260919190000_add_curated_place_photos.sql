-- Google photo resource names and image bytes are intentionally never persisted.
-- Only the place ID and Focus's own decisions about current photo positions live here.
alter table public.venue_candidates
  add column if not exists google_place_id text,
  add column if not exists published_branch_id uuid references public.venue_branches(id),
  add column if not exists public_summary_ar text,
  add column if not exists public_summary_en text,
  add column if not exists public_best_for text[] not null default '{}',
  add column if not exists public_signals text[] not null default '{}';

create unique index if not exists venue_candidates_published_branch_id_key
  on public.venue_candidates(published_branch_id)
  where published_branch_id is not null;

create table if not exists public.venue_candidate_photo_choices (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.venue_candidates(id) on delete cascade,
  photo_position smallint not null check (photo_position between 0 and 9),
  approved_for_display boolean not null default false,
  excluded boolean not null default false,
  display_order smallint not null default 0,
  relevance text not null default 'unreviewed' check
    (relevance in ('interior', 'tables', 'seating', 'laptop', 'outlets', 'atmosphere', 'outdoor', 'exterior', 'parking', 'unreviewed')),
  founder_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  unique(candidate_id, photo_position),
  check (not (approved_for_display and excluded))
);

alter table public.venue_candidate_photo_choices enable row level security;
revoke all on public.venue_candidate_photo_choices from anon, authenticated;
grant select on public.venue_candidate_photo_choices to authenticated;
create policy "founders_select_photo_choices"
  on public.venue_candidate_photo_choices for select to authenticated
  using ((select public.is_focus_founder(auth.uid())));

create or replace function public.set_candidate_photo_choice(
  target_candidate_id uuid,
  target_photo_position smallint,
  target_decision text,
  target_display_order smallint default 0,
  target_relevance text default 'unreviewed',
  target_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_focus_founder(auth.uid()) then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  if target_photo_position not between 0 and 9
    or target_decision not in ('approved', 'excluded')
    or target_relevance not in
      ('interior', 'tables', 'seating', 'laptop', 'outlets', 'atmosphere', 'outdoor', 'exterior', 'parking', 'unreviewed') then
    raise exception 'invalid_photo_choice' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.venue_candidates
    where id = target_candidate_id and google_place_id is not null
  ) then
    raise exception 'candidate_place_id_required' using errcode = '23514';
  end if;
  insert into public.venue_candidate_photo_choices
    (candidate_id, photo_position, approved_for_display, excluded, display_order,
     relevance, founder_note, reviewed_by, reviewed_at)
  values
    (target_candidate_id, target_photo_position, target_decision = 'approved',
     target_decision = 'excluded', target_display_order, target_relevance,
     nullif(btrim(target_note), ''), auth.uid(), now())
  on conflict (candidate_id, photo_position) do update set
    approved_for_display = excluded.approved_for_display,
    excluded = excluded.excluded,
    display_order = excluded.display_order,
    relevance = excluded.relevance,
    founder_note = excluded.founder_note,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at;
end;
$$;
revoke all on function public.set_candidate_photo_choice(uuid,smallint,text,smallint,text,text) from public;
grant execute on function public.set_candidate_photo_choice(uuid,smallint,text,smallint,text,text) to authenticated;

create or replace function public.move_candidate_photo_choice(
  target_candidate_id uuid,
  target_photo_position smallint,
  direction smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order smallint;
  other_position smallint;
  other_order smallint;
begin
  if not public.is_focus_founder(auth.uid()) then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  if direction not in (-1, 1) then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;
  select display_order into current_order
  from public.venue_candidate_photo_choices
  where candidate_id = target_candidate_id and photo_position = target_photo_position
    and approved_for_display and not excluded;
  if current_order is null then return; end if;
  select photo_position, display_order into other_position, other_order
  from public.venue_candidate_photo_choices
  where candidate_id = target_candidate_id and approved_for_display and not excluded
    and photo_position <> target_photo_position
    and ((direction = -1 and display_order < current_order)
      or (direction = 1 and display_order > current_order))
  order by
    case when direction = -1 then display_order end desc,
    case when direction = 1 then display_order end asc
  limit 1;
  if other_position is null then return; end if;
  update public.venue_candidate_photo_choices
  set display_order = case when photo_position = target_photo_position then other_order else current_order end,
      reviewed_by = auth.uid(), reviewed_at = now()
  where candidate_id = target_candidate_id
    and photo_position in (target_photo_position, other_position);
end;
$$;
revoke all on function public.move_candidate_photo_choice(uuid,smallint,smallint) from public;
grant execute on function public.move_candidate_photo_choice(uuid,smallint,smallint) to authenticated;

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
    ), '[]'::jsonb)
  )
  from public.venue_candidates c
  join public.venue_branches b on b.id = c.published_branch_id
  where b.id = target_branch_id and b.is_published
    and c.status = 'approved' and c.approved_for_publication
  limit 1;
$$;
revoke all on function public.get_public_venue_enrichment(uuid) from public;
grant execute on function public.get_public_venue_enrichment(uuid) to anon, authenticated;

-- Existing public WEE stays published. Research remains private until founder approval.
update public.venue_candidates
set name_ar = 'WEE', name_en = 'WEE',
    google_place_id = 'ChIJD1fl8PLjLj4RmPZvudqW1cg',
    published_branch_id = (
      select id from public.venue_branches where slug = 'wee-riyadh' limit 1
    ),
    public_summary_ar = 'الصور تُظهر جلسات داخلية وطاولات عمل، ومصدر مستقل يذكر استخدام المكان للابتوب.',
    public_summary_en = 'Photos show indoor seating and work tables; an independent source mentions laptop use.',
    public_best_for = array['remote_work'],
    public_signals = array['tables', 'seating']
where research_key = 'wee-an-nakheel-riyadh';

update public.venues
set name_ar = 'WEE', name_en = 'WEE'
where id in (
  select venue_id from public.venue_branches where slug = 'wee-riyadh'
);
