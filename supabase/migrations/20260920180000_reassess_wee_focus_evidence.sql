-- A small, manual, branch-specific reassessment. Google reviews are not Focus reviews:
-- no review text, author data, Google rating, or Google-derived photo is stored here.
-- The editorial eligibility score stays separate from the community Focus Score.
update public.venue_candidate_evidence as evidence
set evidence_level = revised.level,
    score_awarded = revised.score,
    summary = revised.summary
from (values
  ('seating', 'strong', 21, 'طاولات وجلسات داخلية متعددة؛ بعض الزوار يمدحون راحة المقاعد، لكن تجربة الجلوس الطويل غير محسومة.'),
  ('study_laptop', 'strong', 17, 'توجد شهادات من زوار عن المذاكرة والعمل باللابتوب، خاصة في الدور العلوي؛ ليست تقييمات Focus.'),
  ('quietness', 'some', 10, 'عدة تجارب تصف المكان بالهادئ، لكن معظمها قديم ويتغير الازدحام حسب الوقت.'),
  ('wifi', 'some', 2, 'ورد توفر الإنترنت في تجربة قديمة، بينما تجربة أحدث تصف سرعته بالبطيئة؛ لا تُعرض شارة إيجابية.'),
  ('outlets', 'some', 2, 'ذكر زائر قديم توفر أفياش؛ العدد والموقع والتوفر الحالي غير متحقق منها.'),
  ('parking_access', 'some', 5, 'ذُكرت مواقف محدودة في تجربة زائر؛ لا يوجد تحقق ميداني من سهولة الوقوف.'),
  ('long_stay', 'negative', 1, 'مراجعة أحدث ترى أن المقاعد مريحة لكن المكان غير ملائم للبقاء طويلًا؛ سياسة الجلوس غير مؤكدة.'),
  ('environment', 'strong', 5, 'المساحة الداخلية والإضاءة الطبيعية موثقتان بصور مرجعية؛ لم تُنسخ الصور إلى Focus.')
) as revised(category, level, score, summary)
where evidence.candidate_id = '11111111-1111-4111-8111-111111111111'
  and evidence.category = revised.category;

update public.venue_candidates
set name_ar = 'ووي',
    focus_eligibility = (
      select sum(score_awarded)::integer
      from public.venue_candidate_evidence
      where candidate_id = '11111111-1111-4111-8111-111111111111'
    ),
    confidence = 'low',
    why_it_may_fit = 'الطاولات والمساحة الداخلية وتجارب بعض الزوار تدعم جلسة دراسة فردية، خصوصًا في الدور العلوي. هذا استنتاج بحثي مبدئي وليس Focus Score.',
    possible_concerns = 'تجارب الإنترنت متعارضة مع بلاغ أحدث عن بطء السرعة، وتوجد ملاحظة أحدث ضد الجلسات الطويلة وأخرى عن دورات المياه. الأفياش والمواقف لم تُتحقق ميدانيًا. حساب Instagram التاريخي غير متاح وقت المراجعة.',
    public_summary_ar = 'طاولات وجلسات للمذاكرة الفردية؛ لكن سرعة النت وملاءمة الجلسات الطويلة غير مؤكدة.',
    public_summary_en = 'Tables for solo study, but Wi-Fi speed and long stays remain uncertain.',
    public_best_for = array['quick_study'],
    public_signals = array['tables', 'seating'],
    researched_at = '2026-09-20T00:00:00Z',
    updated_at = now()
where research_key = 'wee-an-nakheel-riyadh';

update public.venues
set name_ar = 'ووي'
where id in (
  select venue_id from public.venue_branches where slug = 'wee-riyadh'
);

update public.venue_candidate_sources
set checked_at = '2026-09-20T00:00:00Z',
    information_summary = 'فرع سالم بن معقل يعرض اسم Wee / ووي. مراجعات المذاكرة والعمل والهدوء إيجابية في بعض التجارب، مع ملاحظات مقابلة عن بطء الإنترنت وعدم ملاءمة البقاء الطويل؛ لم تُنقل التقييمات العامة إلى Focus Score.',
    attribution_text = 'Manual editorial assessment from Google Maps reviews; open the source to read current reviews.'
where candidate_id = '11111111-1111-4111-8111-111111111111'
  and source_type = 'google_maps';

update public.venue_candidate_sources
set checked_at = '2026-09-20T00:00:00Z',
    information_summary = 'ذكر المقال حساب @weecafe_sa باسم Wee | ووي، لكن صفحة الحساب نفسها لم تكن متاحة عند الفحص؛ لا يمكن اعتبار صورها متاحة للاستخدام الآن.'
where candidate_id = '11111111-1111-4111-8111-111111111111'
  and source_type = 'social'
  and source_url = 'https://www.villa88.com/live/8-of-the-prettiest-coffee-shops-in-saudi-arabia/';
