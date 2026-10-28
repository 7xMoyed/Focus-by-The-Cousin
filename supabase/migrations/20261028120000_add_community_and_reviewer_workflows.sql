-- Launch-readiness community and reviewer workflow.
-- Additive only: existing discovery, founder review, and venue data remain intact.

create table if not exists public.venue_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_id uuid not null references public.venue_branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

create index if not exists venue_likes_branch_created_at_idx
  on public.venue_likes (branch_id, created_at desc);

alter table public.venue_likes enable row level security;
revoke all on public.venue_likes from anon, authenticated;
grant select, insert, delete on public.venue_likes to authenticated;

drop policy if exists "venue_likes_select_own" on public.venue_likes;
create policy "venue_likes_select_own"
  on public.venue_likes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "venue_likes_insert_own" on public.venue_likes;
create policy "venue_likes_insert_own"
  on public.venue_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "venue_likes_delete_own" on public.venue_likes;
create policy "venue_likes_delete_own"
  on public.venue_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.get_branch_like_count(target_branch_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.venue_likes where branch_id = target_branch_id;
$$;

revoke all on function public.get_branch_like_count(uuid) from public;
grant execute on function public.get_branch_like_count(uuid) to anon, authenticated;

create table if not exists public.reviewer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  bio text check (bio is null or char_length(bio) <= 280),
  city_code text check (city_code is null or city_code in ('riyadh', 'majmaah')),
  avatar_url text,
  is_approved boolean not null default false,
  is_public boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviewer_profiles enable row level security;
revoke all on public.reviewer_profiles from anon, authenticated;
grant select on public.reviewer_profiles to anon, authenticated;
grant update (display_name, bio, city_code, avatar_url, is_public, updated_at)
  on public.reviewer_profiles to authenticated;

drop policy if exists "reviewer_profiles_public_read" on public.reviewer_profiles;
create policy "reviewer_profiles_public_read"
  on public.reviewer_profiles for select to anon, authenticated
  using (is_approved and is_public);

drop policy if exists "reviewer_profiles_select_own" on public.reviewer_profiles;
create policy "reviewer_profiles_select_own"
  on public.reviewer_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "reviewer_profiles_update_own" on public.reviewer_profiles;
create policy "reviewer_profiles_update_own"
  on public.reviewer_profiles for update to authenticated
  using ((select auth.uid()) = user_id and is_approved)
  with check ((select auth.uid()) = user_id and is_approved);

create table if not exists public.reviewer_submissions (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.reviewer_profiles(user_id) on delete cascade,
  branch_id uuid references public.venue_branches(id) on delete set null,
  candidate_id uuid references public.venue_candidates(id) on delete set null,
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'changes_requested', 'approved', 'rejected')
  ),
  current_step smallint not null default 1 check (current_step between 1 and 3),
  cafe_name text not null default '' check (char_length(cafe_name) <= 120),
  city_code text check (city_code is null or city_code in ('riyadh', 'majmaah')),
  area_code text check (area_code is null or char_length(area_code) <= 80),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 100),
  branch_name text check (branch_name is null or char_length(branch_name) <= 120),
  google_maps_url text,
  address text check (address is null or char_length(address) <= 300),
  evaluation jsonb not null default '{}'::jsonb check (
    jsonb_typeof(evaluation) = 'object' and octet_length(evaluation::text) <= 8192
  ),
  review_text text check (review_text is null or char_length(review_text) <= 1200),
  photo_paths jsonb not null default '[]'::jsonb check (
    jsonb_typeof(photo_paths) = 'array' and jsonb_array_length(photo_paths) <= 8
  ),
  visited_on date,
  overall_rating smallint check (overall_rating between 1 and 5),
  founder_note text,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviewer_submissions_reviewer_status_idx
  on public.reviewer_submissions (reviewer_id, status, updated_at desc);
create index if not exists reviewer_submissions_status_idx
  on public.reviewer_submissions (status, submitted_at desc);

alter table public.reviewer_submissions enable row level security;
revoke all on public.reviewer_submissions from anon, authenticated;
grant select, insert, update, delete on public.reviewer_submissions to authenticated;

drop policy if exists "reviewers_select_own_submissions" on public.reviewer_submissions;
create policy "reviewers_select_own_submissions"
  on public.reviewer_submissions for select to authenticated
  using (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.reviewer_profiles rp
      where rp.user_id = (select auth.uid()) and rp.is_approved
    )
  );

drop policy if exists "reviewers_insert_own_submissions" on public.reviewer_submissions;
create policy "reviewers_insert_own_submissions"
  on public.reviewer_submissions for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and status = 'draft'
    and exists (
      select 1 from public.reviewer_profiles rp
      where rp.user_id = (select auth.uid()) and rp.is_approved
    )
  );

drop policy if exists "reviewers_update_own_submissions" on public.reviewer_submissions;
create policy "reviewers_update_own_submissions"
  on public.reviewer_submissions for update to authenticated
  using (
    reviewer_id = (select auth.uid())
    and status in ('draft', 'changes_requested')
  )
  with check (
    reviewer_id = (select auth.uid())
    and status in ('draft', 'submitted')
  );

drop policy if exists "reviewers_delete_own_drafts" on public.reviewer_submissions;
create policy "reviewers_delete_own_drafts"
  on public.reviewer_submissions for delete to authenticated
  using (reviewer_id = (select auth.uid()) and status = 'draft');

-- Public reads only approved evaluations and never exposes reviewer email/auth data.
drop policy if exists "approved_reviewer_submissions_public_read" on public.reviewer_submissions;
create policy "approved_reviewer_submissions_public_read"
  on public.reviewer_submissions for select to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1 from public.reviewer_profiles rp
      where rp.user_id = reviewer_id and rp.is_approved and rp.is_public
    )
  );

-- Founder moderation stays server-side through the service role. No client is
-- granted permission to approve reviewers or submissions.
comment on table public.reviewer_submissions is
  'Reviewer-owned drafts and founder-moderated venue evaluations.';
comment on table public.venue_likes is
  'One authenticated community like per user and venue branch.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reviewer-photos',
  'reviewer-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "approved_reviewers_upload_own_photos" on storage.objects;
create policy "approved_reviewers_upload_own_photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reviewer-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.reviewer_profiles rp
      where rp.user_id = (select auth.uid()) and rp.is_approved
    )
  );

drop policy if exists "reviewers_read_own_photos" on storage.objects;
create policy "reviewers_read_own_photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reviewer-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "reviewers_delete_own_photos" on storage.objects;
create policy "reviewers_delete_own_photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reviewer-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Public reviewer data is exposed through narrow security-definer functions so
-- auth user ids and founder-only moderation fields never become queryable.
drop view if exists public.public_reviewer_profiles;
drop view if exists public.public_reviewer_evaluations;

create or replace function public.list_public_reviewer_profiles(p_slug text default null)
returns table (
  slug text,
  display_name text,
  bio text,
  city_code text,
  avatar_url text,
  approved_review_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rp.slug,
    rp.display_name,
    rp.bio,
    rp.city_code,
    rp.avatar_url,
    count(rs.id) filter (where rs.status = 'approved')::integer
  from public.reviewer_profiles rp
  left join public.reviewer_submissions rs on rs.reviewer_id = rp.user_id
  where rp.is_approved
    and rp.is_public
    and (p_slug is null or rp.slug = p_slug)
  group by rp.user_id, rp.slug, rp.display_name, rp.bio, rp.city_code, rp.avatar_url
  order by count(rs.id) filter (where rs.status = 'approved') desc, rp.display_name;
$$;

create or replace function public.list_public_reviewer_evaluations(
  p_reviewer_slug text default null,
  p_branch_id uuid default null
)
returns table (
  id uuid,
  reviewer_slug text,
  reviewer_name text,
  reviewer_avatar_url text,
  branch_id uuid,
  cafe_name text,
  city_code text,
  area_code text,
  neighborhood text,
  branch_name text,
  evaluation jsonb,
  review_text text,
  visited_on date,
  overall_rating smallint,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rs.id,
    rp.slug,
    rp.display_name,
    rp.avatar_url,
    rs.branch_id,
    rs.cafe_name,
    rs.city_code,
    rs.area_code,
    rs.neighborhood,
    rs.branch_name,
    rs.evaluation,
    rs.review_text,
    rs.visited_on,
    rs.overall_rating,
    rs.reviewed_at
  from public.reviewer_submissions rs
  join public.reviewer_profiles rp on rp.user_id = rs.reviewer_id
  where rs.status = 'approved'
    and rp.is_approved
    and rp.is_public
    and (p_reviewer_slug is null or rp.slug = p_reviewer_slug)
    and (p_branch_id is null or rs.branch_id = p_branch_id)
  order by rs.visited_on desc nulls last, rs.reviewed_at desc nulls last;
$$;

revoke all on function public.list_public_reviewer_profiles(text) from public;
revoke all on function public.list_public_reviewer_evaluations(text, uuid) from public;
grant execute on function public.list_public_reviewer_profiles(text) to anon, authenticated;
grant execute on function public.list_public_reviewer_evaluations(text, uuid) to anon, authenticated;
