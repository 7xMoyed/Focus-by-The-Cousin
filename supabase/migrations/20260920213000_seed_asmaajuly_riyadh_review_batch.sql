-- Founder-supplied @asmaajuly TikTok review batch (18 Riyadh places).
-- The creator's /10 ratings are editorial seed scores (x10), never community Focus Scores.
-- No video permalink, exact address, coordinates, Google Place ID or unreported amenity is inferred.
-- Qualitative observations live in the candidate notes; no invented category scores are inserted.
-- Keep founder decisions on rerun: a matching research_key is never overwritten.
insert into public.venue_candidates (
  research_key, status, venue_type, name_ar, name_en, city_code,
  neighborhood_ar, neighborhood_en, focus_eligibility, confidence,
  why_it_may_fit, possible_concerns, duplicate_status, duplicate_notes, researched_at
) values
  (
    'asmaajuly-riyadh-labeit-al-qirawan', 'pending', 'cafe',
    'لابيت سبيشالتي كوفي', 'Labeit Specialty Coffee', 'riyadh', 'القيروان', 'Al Qirawan', 80, 'low',
    'بحسب مراجعة @asmaajuly: توجد أفياش والمكان مناسب للعمل.',
    'المراجعة تصفه بغير الهادئ. جودة الإنترنت، راحة الجلسات وبقية الخدمات غير موثقة؛ يلزم تأكيد الفرع قبل النشر.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-seen-al-muruj', 'pending', 'cafe',
    'سين', 'Seen', 'riyadh', 'المروج', 'Al Muruj', 90, 'low',
    'بحسب مراجعة @asmaajuly: أفياش وهدوء ودورات مياه، ومناسب للعمل.',
    'المواقف ضعيفة حسب المراجعة. بقية الخدمات غير موثقة؛ يلزم تأكيد الفرع قبل النشر.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-breddy-branch-unconfirmed', 'pending', 'cafe',
    'بريدي أرتيزان بيكري', 'Breddy Artisan Bakery', 'riyadh', null, null, 50, 'low',
    'بحسب مراجعة @asmaajuly: القهوة والطعام جيدان.',
    'الجلسات والأفياش والهدوء ودورات المياه وملاءمة العمل ضعيفة أو غير متوفرة حسب المراجعة. الفرع غير محدد؛ بقية الخدمات غير موثقة.',
    'not_checked', 'هوية الفرع تحتاج تحققًا قبل المقارنة أو النشر.', now()
  ),
  (
    'asmaajuly-riyadh-bab-al-muhammadiyah', 'pending', 'cafe',
    'باب', 'Bab', 'riyadh', 'المحمدية', 'Al Muhammadiyah', 60, 'low',
    'بحسب مراجعة @asmaajuly: القهوة والطعام ودورات المياه جيدة.',
    'الجلسات والأفياش والهدوء وملاءمة العمل ضعيفة حسب المراجعة. بقية الخدمات غير موثقة؛ يلزم تأكيد الفرع.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-commune-al-qirawan', 'pending', 'cafe',
    'كوميون', 'COMMUNE', 'riyadh', 'القيروان', 'Al Qirawan', 70, 'low',
    'بحسب مراجعة @asmaajuly: أفياش وهدوء ودورات مياه، ومناسب للعمل.',
    'الجلسات ضعيفة حسب المراجعة. بقية الخدمات غير موثقة؛ يلزم تأكيد الفرع.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-butter-bakery-branch-unconfirmed', 'pending', 'cafe',
    'بتر بيكري', 'Butter Bakery', 'riyadh', null, null, 50, 'low',
    'بحسب مراجعة @asmaajuly: القهوة والطعام جيدان.',
    'الجلسات والأفياش والهدوء ودورات المياه والمواقف وملاءمة العمل ضعيفة حسب المراجعة. الفرع غير محدد؛ بقية الخدمات غير موثقة.',
    'not_checked', 'هوية الفرع تحتاج تحققًا قبل المقارنة أو النشر.', now()
  ),
  (
    'asmaajuly-riyadh-easy-bakery-branch-unconfirmed', 'pending', 'cafe',
    'إيزي بيكري', 'Easy Bakery', 'riyadh', null, null, 40, 'low',
    'بحسب مراجعة @asmaajuly: القهوة والطعام جيدان.',
    'الجلسات والأفياش والهدوء ودورات المياه والمواقف وملاءمة العمل ضعيفة حسب المراجعة. الفرع غير محدد؛ بقية الخدمات غير موثقة.',
    'not_checked', 'هوية الفرع تحتاج تحققًا قبل المقارنة أو النشر.', now()
  ),
  (
    'asmaajuly-riyadh-helms-bakery-branch-unconfirmed', 'pending', 'cafe',
    'هلمز بيكري', 'Helms Bakery', 'riyadh', null, null, 30, 'low',
    'بحسب مراجعة @asmaajuly: القهوة والطعام ودورات المياه والمواقف جيدة.',
    'الجلسات والأفياش والهدوء وملاءمة العمل ضعيفة حسب المراجعة. الفرع غير محدد؛ بقية الخدمات غير موثقة.',
    'not_checked', 'هوية الفرع تحتاج تحققًا قبل المقارنة أو النشر.', now()
  ),
  (
    'asmaajuly-riyadh-costa-branch-unconfirmed', 'needs_review', 'cafe',
    'كوستا كوفي', 'Costa Coffee', 'riyadh', null, null, 100, 'low',
    'مراجعة @asmaajuly إيجابية بشأن مزايا الدراسة والعمل الأساسية في الفرع المصوّر.',
    'هوية الفرع المصوّر غير معروفة؛ لا تُنسب المزايا إلى فروع كوستا الأخرى. تفاصيل كل ميزة والموقع تتطلب مراجعة المقطع والفرع قبل الاعتماد.',
    'not_checked', 'مطابقة الفرع شرط قبل المقارنة أو النشر.', now()
  ),
  (
    'asmaajuly-riyadh-sharik-branch-unconfirmed', 'needs_review', 'coworking',
    'شارك', 'Sharik', 'riyadh', null, null, 100, 'low',
    'مراجعة @asmaajuly إيجابية بشأن مزايا الدراسة والعمل الأساسية في الموقع المصوّر.',
    'الفرع المصوّر غير معروف؛ لا تُنسب المزايا إلى فرع النخيل القائم أو أي فرع آخر قبل المطابقة.',
    'possible_match', 'يوجد مرشح قائم: sharik-al-nakheel-riyadh. هذه مراجعة لفرع غير محدد، وليست إثباتًا أنها لفرع النخيل؛ احسم التطابق قبل النشر أو الدمج.', now()
  ),
  (
    'asmaajuly-riyadh-cultural-house-al-taawun', 'pending', 'library',
    'البيت الثقافي – مكتبة التعاون العامة', 'The Cultural House – Altaawun Public Library',
    'riyadh', 'التعاون', 'Al Taawun', 100, 'low',
    'بحسب مراجعة @asmaajuly: أفياش وواي فاي وهدوء ودورات مياه ومواقف، ومناسب للعمل.',
    'المقاعد قد تكون محدودة أو المكان مزدحمًا. أوقات العمل والدخول وبقية الخدمات تحتاج تحققًا قبل النشر.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-king-abdulaziz-public-library-branch-unconfirmed', 'pending', 'library',
    'مكتبة الملك عبدالعزيز العامة', 'King Abdulaziz Public Library', 'riyadh', null, null, 90, 'low',
    'بحسب مراجعة @asmaajuly: جلسات وأفياش وواي فاي وهدوء ودورات مياه ومواقف، ومناسبة للعمل.',
    'الفرع الدقيق غير محدد؛ لا تُنسب هذه المزايا إلى فروع أخرى. أوقات العمل وشروط الدخول تحتاج تحققًا قبل النشر.',
    'not_checked', 'تحقق من الفرع الدقيق قبل المقارنة أو النشر.', now()
  ),
  (
    'asmaajuly-riyadh-king-fahad-national-library', 'pending', 'library',
    'مكتبة الملك فهد الوطنية', 'King Fahad National Library', 'riyadh', null, null, 90, 'low',
    'بحسب مراجعة @asmaajuly: جلسات وأفياش وواي فاي وهدوء ودورات مياه، ومناسبة للعمل.',
    'المواقف ضعيفة حسب المراجعة. أوقات العمل وشروط الدخول وبقية الخدمات تحتاج تحققًا قبل النشر.',
    'not_checked', 'لم يُحسم تطابقه مع أي مرشح خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-pick-hittin', 'pending', 'cafe',
    'بيك كافيه', 'Pick Cafe', 'riyadh', 'حطين', 'Hittin', 50, 'low',
    'بحسب مراجعة @asmaajuly: القهوة والطعام ودورات المياه والمواقف جيدة.',
    'الجلسات والأفياش والواي فاي والهدوء وملاءمة العمل ضعيفة حسب المراجعة. بقية الخدمات غير موثقة؛ يلزم تأكيد الفرع.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-wooden-al-malqa', 'pending', 'cafe',
    'وودن كوفي', 'Wooden Coffee', 'riyadh', 'الملقا', 'Al Malqa', 100, 'low',
    'بحسب مراجعة @asmaajuly: جلسات وأفياش وواي فاي وهدوء ودورات مياه ومواقف، ومناسب للعمل.',
    'التوفر الفعلي حسب الوقت وبقية الخدمات غير موثقة؛ يلزم تأكيد الفرع قبل النشر.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-mahd-al-narjis', 'pending', 'cafe',
    'مهد كافيه الثقافي', 'Mahd Cultural Cafe', 'riyadh', 'النرجس', 'Al Narjis', 90, 'low',
    'بحسب مراجعة @asmaajuly: أفياش وواي فاي وهدوء ودورات مياه ومواقف، ومناسب للعمل.',
    'جلسات العمل في الدور الأرضي محدودة وليست مريحة جدًا حسب المراجعة. بقية الخدمات غير موثقة؛ يلزم تأكيد الفرع.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-ashjar-al-qirawan', 'pending', 'cafe',
    'أشجار كافيه', 'Ashjar Cafe', 'riyadh', 'القيروان', 'Al Qirawan', 90, 'low',
    'بحسب مراجعة @asmaajuly: أفياش وواي فاي ودورات مياه ومواقف، ومناسب للعمل.',
    'المنطقة الهادئة تتطلب حجزًا وبقية المكان قد تكون صاخبة. بقية الخدمات غير موثقة؛ يلزم تأكيد الفرع.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  ),
  (
    'asmaajuly-riyadh-sofia-qurtubah', 'pending', 'cafe',
    'صوفيا الرياض', 'Sofia Riyadh', 'riyadh', 'قرطبة', 'Qurtubah', 80, 'low',
    'بحسب مراجعة @asmaajuly: أفياش وهدوء ودورات مياه، ومناسب للعمل.',
    'الجلسات محدودة والواي فاي غير مؤكد والمواقف سيئة جدًا حسب المراجعة. نوع الخدمة وتفاصيل الفرع الأخرى تحتاج تحققًا قبل النشر.',
    'not_checked', 'لم يُحسم تطابقه مع أي فرع خاص قائم.', now()
  )
on conflict (research_key) do nothing;

-- A profile link is not a video permalink. Record the founder-provided attribution honestly.
insert into public.venue_candidate_sources (
  candidate_id, source_type, source_title, source_url, checked_at,
  information_summary, attribution_text
)
select c.id, 'social', '@asmaajuly — TikTok review batch',
  'https://www.tiktok.com/@asmaajuly', now(),
  'Founder-provided review: ' || batch.creator_score || '/10. Editorial seed score only, not a community Focus Score. Reported amenities and caveats are in the candidate notes. Individual video URL was not supplied.',
  '@asmaajuly on TikTok; observations and score supplied by founder, video permalink not independently verified.'
from (values
  ('asmaajuly-riyadh-labeit-al-qirawan', 8),
  ('asmaajuly-riyadh-seen-al-muruj', 9),
  ('asmaajuly-riyadh-breddy-branch-unconfirmed', 5),
  ('asmaajuly-riyadh-bab-al-muhammadiyah', 6),
  ('asmaajuly-riyadh-commune-al-qirawan', 7),
  ('asmaajuly-riyadh-butter-bakery-branch-unconfirmed', 5),
  ('asmaajuly-riyadh-easy-bakery-branch-unconfirmed', 4),
  ('asmaajuly-riyadh-helms-bakery-branch-unconfirmed', 3),
  ('asmaajuly-riyadh-costa-branch-unconfirmed', 10),
  ('asmaajuly-riyadh-sharik-branch-unconfirmed', 10),
  ('asmaajuly-riyadh-cultural-house-al-taawun', 10),
  ('asmaajuly-riyadh-king-abdulaziz-public-library-branch-unconfirmed', 9),
  ('asmaajuly-riyadh-king-fahad-national-library', 9),
  ('asmaajuly-riyadh-pick-hittin', 5),
  ('asmaajuly-riyadh-wooden-al-malqa', 10),
  ('asmaajuly-riyadh-mahd-al-narjis', 9),
  ('asmaajuly-riyadh-ashjar-al-qirawan', 9),
  ('asmaajuly-riyadh-sofia-qurtubah', 8)
) as batch(research_key, creator_score)
join public.venue_candidates c on c.research_key = batch.research_key
on conflict (candidate_id, source_url) do nothing;
