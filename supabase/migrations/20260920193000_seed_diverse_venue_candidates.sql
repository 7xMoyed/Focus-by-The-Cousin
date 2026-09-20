-- Branch-specific research candidates. Founder review is still required before publication.
-- Unknown amenities remain unknown; these editorial scores are not community Focus Scores.
insert into public.venue_candidates (
  id, research_key, name_ar, name_en, branch_name_ar, branch_name_en,
  city_code, neighborhood_ar, neighborhood_en, address_ar, address_en,
  google_maps_url, official_website_url, focus_eligibility, confidence,
  why_it_may_fit, possible_concerns, duplicate_status, duplicate_notes, researched_at
) values
  (
    '33333333-3333-4333-8333-333333333333', 'ksu-king-salman-central-library-riyadh',
    'مكتبة الملك سلمان المركزية', 'King Salman Central Library',
    'جامعة الملك سعود', 'King Saud University', 'riyadh',
    'جامعة الملك سعود', 'King Saud University', 'حرم جامعة الملك سعود، الرياض',
    'King Saud University campus, Riyadh',
    'https://www.google.com/maps/search/?api=1&query=King+Salman+Central+Library+King+Saud+University',
    'https://library.ksu.edu.sa/ar/node/2148', 56, 'medium',
    'الموقع الرسمي يؤكد قاعات القراءة والبحث، ويلزم بالهدوء، ويجيز الزيارة لغير منسوبي الجامعة وفق سياسة المكتبة.',
    'ليست مناسبة لمكالمات العمل أو جلسات القروب الصاخبة. تأكد من ساعات اليوم، الدخول، المقاعد، الواي فاي والأفياش قبل النشر.',
    'not_checked', 'يلزم فحص تكرار الفرع في قاعدة Focus الخاصة قبل الاعتماد.', now()
  ),
  (
    '44444444-4444-4444-8444-444444444444', 'mu-central-library-al-majmaah',
    'المكتبة المركزية بجامعة المجمعة', 'Majmaah University Central Library',
    'فرع المجمعة', 'Al Majmaah branch', 'majmaah',
    'المدينة الجامعية', 'University campus', 'جامعة المجمعة، المجمعة',
    'Majmaah University campus, Al Majmaah',
    'https://www.google.com/maps/search/?api=1&query=Majmaah+University+Central+Library',
    'https://www.mu.edu.sa/ar/administrations/general-administration-of-libraries-and-knowledge-resources/217767',
    52, 'medium',
    'الجامعة تؤكد وجود المكتبة المركزية وخدمة الاطلاع الداخلي وقاعة لخدمة الإنترنت؛ خيار دراسة مختلف عن المقاهي.',
    'سياسة دخول غير المنسوبين، الهدوء الفعلي، الواي فاي، الأفياش وساعات العطل تحتاج تحققًا ميدانيًا.',
    'not_checked', 'يلزم فحص تكرار الفرع في قاعدة Focus الخاصة قبل الاعتماد.', now()
  ),
  (
    '55555555-5555-4555-8555-555555555555', 'sharik-al-nakheel-riyadh',
    'شارك', 'Sharik', 'فرع النخيل', 'Al Nakheel branch', 'riyadh',
    'النخيل', 'Al Nakheel', 'شارع التخصصي، حي النخيل، الرياض',
    'Al Takhassusi Street, Al Nakheel, Riyadh',
    'https://www.google.com/maps/search/?api=1&query=Sharik+Al+Nakheel+Riyadh',
    'https://sharik.com.sa/home-en', 54, 'medium',
    'الموقع الرسمي يثبت فرع النخيل ومساحات عمل مشتركة مخصصة للعمل المستقل، ويذكر الإنترنت عالي السرعة ضمن خدمة المكاتب المشتركة.',
    'قد يتطلب اشتراكًا مدفوعًا وليس جلسة مقهى عادية. السعر والتوفر وساعات هذا الفرع والهدوء والأفياش تحتاج تحققًا قبل النشر.',
    'not_checked', 'يلزم فحص تكرار الفرع في قاعدة Focus الخاصة قبل الاعتماد.', now()
  )
on conflict (research_key) do nothing;

insert into public.venue_candidate_sources (
  candidate_id, source_type, source_title, source_url, checked_at, information_summary, attribution_text
) values
  ('33333333-3333-4333-8333-333333333333', 'official_website', 'KSU Library FAQ', 'https://library.ksu.edu.sa/ar/node/2148', now(), 'الجامعة تؤكد قاعات القراءة والبحث، أوقات مكتبة الملك سلمان، وإمكانية زيارة غير المنسوبين.', 'جامعة الملك سعود'),
  ('33333333-3333-4333-8333-333333333333', 'official_website', 'KSU Library Policy', 'https://library.ksu.edu.sa/en/node/1169', now(), 'السياسة تلزم الزوار بالهدوء وتوضح غرض البحث والتعلم وشروط الدخول.', 'King Saud University'),
  ('44444444-4444-4444-8444-444444444444', 'official_website', 'Majmaah University Library Hours', 'https://www.mu.edu.sa/ar/administrations/general-administration-of-libraries-and-knowledge-resources/217767', now(), 'الجامعة تسرد المكتبة المركزية وساعاتها العامة؛ التغييرات الموسمية تحتاج تأكيدًا.', 'جامعة المجمعة'),
  ('44444444-4444-4444-8444-444444444444', 'official_website', 'Majmaah University Library Services', 'https://www.mu.edu.sa/ar/deanships/deanship-of-library-affairs/6908', now(), 'الجامعة تسرد خدمة الاطلاع الداخلي وقاعة خدمة الإنترنت بالمكتبة المركزية.', 'جامعة المجمعة'),
  ('55555555-5555-4555-8555-555555555555', 'official_website', 'Sharik Official Branches and Services', 'https://sharik.com.sa/home-en', now(), 'الموقع الرسمي يحدد فرع النخيل بشارع التخصصي ويصف المكاتب المشتركة والإنترنت ضمن الخدمات.', 'Sharik official site')
on conflict (candidate_id, source_url) do nothing;

insert into public.venue_candidate_evidence (
  candidate_id, category, evidence_level, score_awarded, max_score, summary
) values
  ('33333333-3333-4333-8333-333333333333', 'seating', 'some', 16, 25, 'قاعات قراءة مذكورة رسميًا، لكن راحة المقاعد وعددها غير متحققين حديثًا.'),
  ('33333333-3333-4333-8333-333333333333', 'study_laptop', 'strong', 18, 20, 'المكتبة مخصصة للبحث والتعلم والدراسة، مع مقصورات دراسية قابلة للحجز.'),
  ('33333333-3333-4333-8333-333333333333', 'quietness', 'strong', 13, 15, 'سياسة الجامعة تلزم بالهدوء وتمنع الإزعاج.'),
  ('33333333-3333-4333-8333-333333333333', 'wifi', 'unknown', 0, 10, 'لا يوجد تحقق من اتصال الزوار بالإنترنت.'),
  ('33333333-3333-4333-8333-333333333333', 'outlets', 'unknown', 0, 10, 'الأفياش غير متحققة.'),
  ('33333333-3333-4333-8333-333333333333', 'parking_access', 'unknown', 0, 10, 'الدخول والمواقف يحتاجان تحققًا.'),
  ('33333333-3333-4333-8333-333333333333', 'long_stay', 'some', 4, 5, 'ساعات العمل المعلنة طويلة نسبيًا، دون ضمان توفر مقعد.'),
  ('33333333-3333-4333-8333-333333333333', 'environment', 'strong', 5, 5, 'مكتبة جامعية بقاعات قراءة وبحث.'),
  ('44444444-4444-4444-8444-444444444444', 'seating', 'some', 15, 25, 'الجامعة تؤكد خدمة الاطلاع الداخلي؛ تفاصيل المقاعد غير معروفة.'),
  ('44444444-4444-4444-8444-444444444444', 'study_laptop', 'strong', 17, 20, 'مكتبة جامعية مخصصة للدراسة والاطلاع.'),
  ('44444444-4444-4444-8444-444444444444', 'quietness', 'some', 10, 15, 'طابع مكتبة أكاديمية؛ مستوى الضوضاء الفعلي لم يُقَس.'),
  ('44444444-4444-4444-8444-444444444444', 'wifi', 'some', 3, 10, 'توجد قاعة لخدمة الإنترنت؛ اتصال جهاز الزائر غير مؤكد.'),
  ('44444444-4444-4444-8444-444444444444', 'outlets', 'unknown', 0, 10, 'الأفياش غير متحققة.'),
  ('44444444-4444-4444-8444-444444444444', 'parking_access', 'unknown', 0, 10, 'سهولة الوصول والمواقف غير متحققة.'),
  ('44444444-4444-4444-8444-444444444444', 'long_stay', 'some', 3, 5, 'ساعات العمل العامة تسمح بجلسة أطول، لكن التوفر والسياسة يحتاجان تحققًا.'),
  ('44444444-4444-4444-8444-444444444444', 'environment', 'some', 4, 5, 'بيئة مكتبة جامعية مع خدمة اطلاع داخلي.'),
  ('55555555-5555-4555-8555-555555555555', 'seating', 'strong', 19, 25, 'الموقع الرسمي يصف مكاتب مشتركة ومساحات عمل، دون تحقق من راحة المقاعد.'),
  ('55555555-5555-4555-8555-555555555555', 'study_laptop', 'strong', 18, 20, 'المكاتب المشتركة تستهدف المستقلين والطلاب ومن يحتاج مكتبًا.'),
  ('55555555-5555-4555-8555-555555555555', 'quietness', 'unknown', 0, 15, 'لا يوجد دليل فرع-محدد على الهدوء.'),
  ('55555555-5555-4555-8555-555555555555', 'wifi', 'some', 7, 10, 'الإنترنت عالي السرعة مذكور للخدمة، لكن جودة الاتصال بفرع النخيل غير مقاسة.'),
  ('55555555-5555-4555-8555-555555555555', 'outlets', 'unknown', 0, 10, 'عدد الأفياش ومواقعها غير مؤكدة.'),
  ('55555555-5555-4555-8555-555555555555', 'parking_access', 'unknown', 0, 10, 'المواقف غير متحققة.'),
  ('55555555-5555-4555-8555-555555555555', 'long_stay', 'some', 5, 5, 'خدمة المكاتب المشتركة قائمة على اشتراكات شهرية أو سنوية، لا على زيارة مقهى قصيرة.'),
  ('55555555-5555-4555-8555-555555555555', 'environment', 'strong', 5, 5, 'مساحة عمل مشتركة مخصصة للعمل والإنتاجية.')
on conflict (candidate_id, category) do nothing;
