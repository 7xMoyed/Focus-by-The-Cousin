alter table public.profiles
  add column if not exists role text not null default 'user';

do $$
begin
  alter table public.profiles
    add constraint profiles_role_valid
    check (role in ('user', 'founder', 'admin')) not valid;
exception when duplicate_object then null;
end;
$$;

-- Users may still maintain their profile, but they may never grant themselves
-- a founder role. The auth trigger remains able to insert because it is a
-- security-definer function.
revoke insert, update on table public.profiles from authenticated;
grant insert (
  id, username, preferred_language, preferred_priorities, preferred_city,
  preferred_session_type, onboarding_completed_at, updated_at
) on table public.profiles to authenticated;
grant update (
  username, preferred_language, preferred_priorities, preferred_city,
  preferred_session_type, onboarding_completed_at, updated_at
) on table public.profiles to authenticated;

create or replace function public.is_focus_founder(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role in ('founder', 'admin')
  );
$$;

revoke all on function public.is_focus_founder(uuid) from public;
grant execute on function public.is_focus_founder(uuid) to authenticated;

create table if not exists public.venue_candidates (
  id uuid primary key default gen_random_uuid(),
  research_key text not null unique,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'needs_review', 'duplicate_candidate')
  ),
  name_ar text not null,
  name_en text not null,
  branch_name_ar text,
  branch_name_en text,
  city_code text not null check (city_code in ('riyadh', 'majmaah')),
  neighborhood_ar text,
  neighborhood_en text,
  address_ar text,
  address_en text,
  latitude double precision,
  longitude double precision,
  google_maps_url text,
  official_website_url text,
  official_instagram_url text,
  official_contact_channels jsonb not null default '{}'::jsonb,
  focus_eligibility smallint not null check (focus_eligibility between 0 and 100),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  why_it_may_fit text not null,
  possible_concerns text not null,
  duplicate_status text not null default 'no_visible_match' check (
    duplicate_status in ('no_visible_match', 'possible_match', 'confirmed_duplicate', 'not_checked')
  ),
  duplicate_notes text,
  approved_for_publication boolean not null default false,
  moderation_reason text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  researched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_candidates_status_city_idx
  on public.venue_candidates (status, city_code, updated_at desc);

create table if not exists public.venue_candidate_sources (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.venue_candidates (id) on delete cascade,
  source_type text not null check (
    source_type in ('google_maps', 'official_website', 'official_instagram', 'directory', 'review_aggregator', 'social', 'other')
  ),
  source_title text not null,
  source_url text not null,
  checked_at timestamptz not null,
  information_summary text not null,
  attribution_text text,
  unique (candidate_id, source_url)
);

create table if not exists public.venue_candidate_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.venue_candidates (id) on delete cascade,
  category text not null check (
    category in ('seating', 'study_laptop', 'quietness', 'wifi', 'outlets', 'parking_access', 'long_stay', 'environment')
  ),
  evidence_level text not null check (
    evidence_level in ('verified', 'strong', 'some', 'unknown', 'negative')
  ),
  score_awarded smallint not null check (score_awarded >= 0),
  max_score smallint not null check (max_score > 0),
  summary text not null,
  unique (candidate_id, category),
  check (score_awarded <= max_score)
);

create table if not exists public.venue_candidate_images (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.venue_candidates (id) on delete cascade,
  source_type text not null,
  source_url text not null,
  external_preview_url text,
  attribution_text text,
  inspection_summary text not null,
  sort_order smallint not null default 0,
  unique (candidate_id, source_url, sort_order)
);

create table if not exists public.venue_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.venue_candidates (id) on delete cascade,
  founder_id uuid not null references auth.users (id),
  action text not null check (action in ('approved', 'rejected', 'needs_review')),
  reason text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.venue_candidates enable row level security;
alter table public.venue_candidate_sources enable row level security;
alter table public.venue_candidate_evidence enable row level security;
alter table public.venue_candidate_images enable row level security;
alter table public.venue_moderation_actions enable row level security;

revoke all on table public.venue_candidates from anon, authenticated;
revoke all on table public.venue_candidate_sources from anon, authenticated;
revoke all on table public.venue_candidate_evidence from anon, authenticated;
revoke all on table public.venue_candidate_images from anon, authenticated;
revoke all on table public.venue_moderation_actions from anon, authenticated;

grant select on table public.venue_candidates to authenticated;
grant select on table public.venue_candidate_sources to authenticated;
grant select on table public.venue_candidate_evidence to authenticated;
grant select on table public.venue_candidate_images to authenticated;
grant select on table public.venue_moderation_actions to authenticated;

create policy "founders_select_venue_candidates"
  on public.venue_candidates for select to authenticated
  using ((select public.is_focus_founder(auth.uid())));
create policy "founders_select_candidate_sources"
  on public.venue_candidate_sources for select to authenticated
  using ((select public.is_focus_founder(auth.uid())));
create policy "founders_select_candidate_evidence"
  on public.venue_candidate_evidence for select to authenticated
  using ((select public.is_focus_founder(auth.uid())));
create policy "founders_select_candidate_images"
  on public.venue_candidate_images for select to authenticated
  using ((select public.is_focus_founder(auth.uid())));
create policy "founders_select_moderation_actions"
  on public.venue_moderation_actions for select to authenticated
  using ((select public.is_focus_founder(auth.uid())));

create or replace function public.moderate_venue_candidate(
  candidate_id uuid,
  decision text,
  reason text default null,
  note text default null
)
returns public.venue_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  moderated public.venue_candidates;
begin
  if not public.is_focus_founder(auth.uid()) then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected', 'needs_review') then
    raise exception 'invalid_moderation_decision' using errcode = '22023';
  end if;

  if decision in ('rejected', 'needs_review') and nullif(btrim(reason), '') is null then
    raise exception 'moderation_reason_required' using errcode = '23514';
  end if;

  update public.venue_candidates
  set status = decision,
      approved_for_publication = decision = 'approved',
      moderation_reason = nullif(btrim(reason), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = candidate_id
  returning * into moderated;

  if moderated.id is null then
    raise exception 'candidate_not_found' using errcode = 'P0002';
  end if;

  insert into public.venue_moderation_actions (candidate_id, founder_id, action, reason, note)
  values (candidate_id, auth.uid(), decision, nullif(btrim(reason), ''), nullif(btrim(note), ''));

  return moderated;
end;
$$;

revoke all on function public.moderate_venue_candidate(uuid, text, text, text) from public;
grant execute on function public.moderate_venue_candidate(uuid, text, text, text) to authenticated;

insert into public.venue_candidates (
  id, research_key, status, name_ar, name_en, branch_name_ar, branch_name_en,
  city_code, neighborhood_ar, neighborhood_en, address_ar, address_en,
  latitude, longitude, google_maps_url, official_instagram_url,
  official_contact_channels, focus_eligibility, confidence, why_it_may_fit,
  possible_concerns, duplicate_status, duplicate_notes, researched_at
)
values
  (
    '11111111-1111-4111-8111-111111111111', 'wee-an-nakheel-riyadh', 'pending',
    'ووي', 'Wee', 'فرع النخيل', 'An Nakheel branch', 'riyadh', 'النخيل', 'An Nakheel',
    'شارع سالم بن معقل، حي النخيل، الرياض', 'Salem Bin Maqil Street, An Nakheel, Riyadh',
    24.7369923, 46.6093314,
    'https://www.google.com/maps/search/?api=1&query=24.7369923,46.6093314&query_place_id=ChIJD1fl8PLjLj4RmPZvudqW1cg',
    'https://www.instagram.com/weecafe_sa/', '{}'::jsonb, 71, 'medium',
    'صور المصدر تظهر مساحة متعددة المستويات، طاولات فعلية، إضاءة طبيعية، وجلسات جانبية. مصدر مستقل يصف استخدام اللابتوب وطاولات العمل والواي فاي.',
    'لا يوجد دليل موثوق على الأفياش، والهدوء قد يتغير وقت الذروة. بعض المصادر القديمة تصف فرعًا سابقًا يعتمد على الدرايف ثرو، لذلك اعتمد البحث على موقع سالم بن معقل المحدث.',
    'no_visible_match', 'لم يظهر أي فرع منشور مطابق في قاعدة Focus وقت الفحص؛ السجلات الخاصة غير مرئية بالمفتاح العام.',
    '2026-09-17T17:30:00Z'
  ),
  (
    '22222222-2222-4222-8222-222222222222', 'tura-al-mahdiyah-riyadh', 'pending',
    'تُرى', 'Tura Cafe', 'فرع المهدية', 'Al Mahdiyah branch', 'riyadh', 'المهدية', 'Al Mahdiyah',
    'شارع السيل الكبير، حي المهدية، الرياض RDMB4059', 'Al Sail Al Kabeer Street, Al Mahdiyah, Riyadh RDMB4059',
    null, null, 'https://maps.google.com/?cid=2747283650895423578', null,
    '{"phone":"+966581869597"}'::jsonb, 21, 'low',
    'الهوية والفرع متطابقان عبر أكثر من دليل، والصور العامة تظهر وجود جلسات داخلية وطاولات وخدمة مقهى فعلية.',
    'لا توجد أدلة كافية على المذاكرة أو اللابتوبات أو الهدوء أو الواي فاي أو الأفياش. الصور توحي بطاولات صغيرة نسبيًا، لذلك لا ينبغي اعتباره مناسبًا للتركيز قبل مراجعة بشرية أو زيارة.',
    'no_visible_match', 'لم يظهر أي فرع منشور مطابق في قاعدة Focus وقت الفحص؛ الاسم قد يظهر أيضًا بصيغة TRE CAFE ويجب حفظه كاسم بديل.',
    '2026-09-17T17:30:00Z'
  )
on conflict (research_key) do update set
  status = excluded.status,
  focus_eligibility = excluded.focus_eligibility,
  confidence = excluded.confidence,
  why_it_may_fit = excluded.why_it_may_fit,
  possible_concerns = excluded.possible_concerns,
  duplicate_notes = excluded.duplicate_notes,
  researched_at = excluded.researched_at,
  updated_at = now();

insert into public.venue_candidate_sources (
  id, candidate_id, source_type, source_title, source_url, checked_at,
  information_summary, attribution_text
)
values
  ('11000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'google_maps', 'Google Maps — Wee An Nakheel', 'https://www.google.com/maps/search/?api=1&query=24.7369923,46.6093314&query_place_id=ChIJD1fl8PLjLj4RmPZvudqW1cg', '2026-09-17T17:30:00Z', 'يثبت الموقع والإحداثيات والفرع على شارع سالم بن معقل.', 'Source: Google Maps'),
  ('11000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'directory', 'Corner — Wee', 'https://www.corner.inc/place/pUAnAnNEt5Xt', '2026-09-17T17:30:00Z', 'عشر صور خارجية منسوبة لمساهمي Google، ووصف لطاولات عمل وجلسات جانبية واستخدام لابتوب وواي فاي.', 'Corner listing; photos attributed individually to Google Maps contributors'),
  ('11000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'social', 'Villa 88 — Wee visual profile', 'https://www.villa88.com/live/8-of-the-prettiest-coffee-shops-in-saudi-arabia/', '2026-09-17T17:30:00Z', 'يربط الحساب @weecafe_sa ويصف المواد الطبيعية والإضاءة والبيئة الهادئة.', 'Editorial source embedding the official Instagram account'),
  ('11000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'review_aggregator', 'Restaurant Guru — Wee Riyadh', 'https://ar.restaurantguru.com/Wee-Riyadh', '2026-09-17T17:30:00Z', 'مصدر تجميعي يذكر العنوان الحالي والواي فاي والمواقف وساعات التشغيل؛ يحتاج تحققًا دوريًا من Google.', 'Aggregated public listing; not treated as Focus verification'),
  ('22000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'google_maps', 'Google Maps — Tura Cafe', 'https://maps.google.com/?cid=2747283650895423578', '2026-09-17T17:30:00Z', 'معرّف Google CID يطابق تُرى في حي المهدية ويعرض صور المكان العامة.', 'Source: Google Maps'),
  ('22000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'directory', 'لسته — تُرى', 'https://listah.io/p/tura-2747283650895423578', '2026-09-17T17:30:00Z', 'يطابق الاسم تُرى / TRE CAFE، حي المهدية، 1,099 مراجعة Google، و12 مرجع صورة من Google وقت الفحص.', 'لسته يعرض روابط مصدر Google ولا تُعاد استضافة الصور داخل Focus'),
  ('22000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'directory', 'Yango Maps — Tura Cafe', 'https://maps.yango.com/ar-ae/org/14190189949/', '2026-09-17T17:30:00Z', 'يثبت العنوان على شارع السيل الكبير والاسم ورقم التواصل وكونه مقهى بخدمة سيارات.', 'Source: Yango Maps')
on conflict (candidate_id, source_url) do update set
  checked_at = excluded.checked_at,
  information_summary = excluded.information_summary,
  attribution_text = excluded.attribution_text;

insert into public.venue_candidate_evidence (
  candidate_id, category, evidence_level, score_awarded, max_score, summary
)
values
  ('11111111-1111-4111-8111-111111111111', 'seating', 'strong', 22, 25, 'أربع صور تمت معاينتها بصريًا تُظهر كراسي مبطنة وطاولات وجلسات متعددة، مع عشرة مراجع صور متاحة.'),
  ('11111111-1111-4111-8111-111111111111', 'study_laptop', 'strong', 18, 20, 'وصف المصدر يذكر طاولات عمل واستخدام لابتوبات وجلسات مذاكرة علوية.'),
  ('11111111-1111-4111-8111-111111111111', 'quietness', 'some', 9, 15, 'جلسات جانبية أهدأ مذكورة، لكن لا يوجد قياس للضوضاء وقد يزدحم وقت الذروة.'),
  ('11111111-1111-4111-8111-111111111111', 'wifi', 'some', 6, 10, 'مصدر مستقل يصف الواي فاي بالجيد؛ لم يتم التحقق منه ميدانيًا.'),
  ('11111111-1111-4111-8111-111111111111', 'outlets', 'unknown', 0, 10, 'لا تظهر أفياش بوضوح ولا يوجد نص موثوق يثبت توفرها.'),
  ('11111111-1111-4111-8111-111111111111', 'parking_access', 'some', 7, 10, 'المصدر يذكر وجود مواقف، والصور تظهر واجهة وصول واضحة؛ السعة غير معروفة.'),
  ('11111111-1111-4111-8111-111111111111', 'long_stay', 'some', 4, 5, 'تنوع الجلسات والطاولات يدعم جلسة أطول، لكن سياسة البقاء غير معروفة.'),
  ('11111111-1111-4111-8111-111111111111', 'environment', 'strong', 5, 5, 'إضاءة طبيعية ومساحة متعددة المستويات وبيئة هادئة بصريًا.'),
  ('22222222-2222-4222-8222-222222222222', 'seating', 'some', 13, 25, 'اثنتا عشرة صورة مرجعية متاحة؛ الصور المرئية تظهر جلسات وطاولات، وبعضها صغير نسبيًا.'),
  ('22222222-2222-4222-8222-222222222222', 'study_laptop', 'unknown', 0, 20, 'لا يظهر استخدام لابتوبات أو مذاكرة في الأدلة التي تمت معاينتها.'),
  ('22222222-2222-4222-8222-222222222222', 'quietness', 'unknown', 0, 15, 'لا توجد إشارة موثوقة للهدوء أو الضوضاء.'),
  ('22222222-2222-4222-8222-222222222222', 'wifi', 'unknown', 0, 10, 'لا يوجد دليل موثوق على الواي فاي.'),
  ('22222222-2222-4222-8222-222222222222', 'outlets', 'unknown', 0, 10, 'لا يوجد دليل مرئي أو نصي على الأفياش.'),
  ('22222222-2222-4222-8222-222222222222', 'parking_access', 'some', 4, 10, 'المصدر يذكر خدمة سيارات ومواقف مهيأة، لكن سهولة المواقف العامة غير مؤكدة.'),
  ('22222222-2222-4222-8222-222222222222', 'long_stay', 'unknown', 1, 5, 'توجد جلسات، لكن لا يوجد دليل على ملاءمة البقاء الطويل.'),
  ('22222222-2222-4222-8222-222222222222', 'environment', 'some', 3, 5, 'مقهى فعلي بواجهة وجلسات داخلية، لكن طابع التركيز غير واضح.')
on conflict (candidate_id, category) do update set
  evidence_level = excluded.evidence_level,
  score_awarded = excluded.score_awarded,
  max_score = excluded.max_score,
  summary = excluded.summary;

insert into public.venue_candidate_images (
  candidate_id, source_type, source_url, attribution_text, inspection_summary, sort_order
)
values
  ('11111111-1111-4111-8111-111111111111', 'google_maps_reference', 'https://www.corner.inc/place/pUAnAnNEt5Xt', 'Photo references shown by Corner; contributors include Yasmeen Matter, Mohammed Alismail, Najd and Khadijah Aziz via Google Maps.', 'أربع صور ظاهرة عوينت: جلسات مبطنة، طاولات فعلية، مساحة مضاءة طبيعيًا، وامتداد داخلي متعدد المناطق. لا تظهر أفياش بوضوح.', 1),
  ('22222222-2222-4222-8222-222222222222', 'google_maps_reference', 'https://maps.google.com/?cid=2747283650895423578', 'Source: Google Maps. Individual author attribution was not exposed by the index, so Focus links to the source instead of re-hosting.', 'اثنتا عشرة صورة مرجعية؛ العينة المرئية تعرض الواجهة، طاولات داخلية وخارجية، وكراسي محدودة. لا يظهر لابتوب أو أفياش.', 1)
on conflict (candidate_id, source_url, sort_order) do update set
  attribution_text = excluded.attribution_text,
  inspection_summary = excluded.inspection_summary;
