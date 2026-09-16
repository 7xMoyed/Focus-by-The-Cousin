import type { Locale } from "@/features/i18n/locale-provider";
import type {
  City,
  LocationChoice,
  Priority,
  RadiusChoice,
  SessionType,
  VisitTime,
} from "@/features/find/types";

type Choice<T extends string> = { value: T; label: string; description?: string };

const common = {
  ar: {
    intro: "بس كم سؤال خفيف نضبط فيها تفضيلاتك أول مرة، وبعدها نلقى لك مكان يناسب جلستك 🧠✨",
    start: "يلا نبدأ 🚀",
    back: "رجوع",
    continue: "نكمل",
    progress: (step: number) => `${step} من 6`,
    cityTitle: "وين جلستك اليوم؟ 📍",
    sessionTitle: "وش نوع الجلسة؟ 🧠",
    timeTitle: "متى ناوي تروح؟ ⏰",
    prioritiesTitle: "وش الأشياء اللي تهمك أكثر؟ ✨",
    prioritiesHint: "اختر إلى 3 أشياء",
    locationTitle: "وين ندوّر لك؟ 📍",
    radiusTitle: "كم تبغاه قريب؟ 🚗",
    areaPlaceholder: "اكتب الحي أو المنطقة",
    locationRequesting: "نطلب موقعك الآن…",
    locationDenied: "ما قدرنا نوصل لموقعك. اختر منطقة يدويًا 👀",
    locationReady: "تم تحديد موقعك 📍",
    matchingTitle: "ندور لك على المكان المناسب… ✨",
    matchingSteps: ["🤫 نشيك الهدوء", "🔌 نشوف الأفياش", "📶 نقارن النت", "📍 نرتب الأقرب"],
    teaserTitle: "اختياراتك جاهزة 🎯",
    teaserDescription: "كمّل حسابك ونرتب لك الأماكن المتاحة حسب جلستك.",
    teaserMatch: "بنستخدمها لهالجلسة",
    reveal: "ورّني أماكني",
    signupTitle: "أماكنك جاهزة ✨",
    signupDescription: "سو لك حساب ونطلع لك أفضل الأماكن ونحفظ جلستك للمرة الجاية.",
    username: "اسم المستخدم",
    usernameNote: "اليوزر بالإنجليزي ويكون خاص فيك 👀",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    passwordHint: "8 أحرف أو أكثر 🔐",
    showPassword: "إظهار",
    hidePassword: "إخفاء",
    checking: "جاري التحقق…",
    available: "متاح ✅",
    taken: "مأخوذ 👀 جرّب غيره",
    invalidUsername: "استخدم 3–20 حرفًا إنجليزيًا أو رقمًا أو نقطة أو شرطة سفلية.",
    invalidEmail: "تأكد من البريد الإلكتروني.",
    invalidPassword: "كلمة المرور لازم تكون 8 أحرف أو أكثر.",
    createAccount: "أنشئ حسابي",
    creating: "نجهّز حسابك…",
    signupError: "ما قدرنا ننشئ الحساب الآن. جرّب مرة ثانية.",
    duplicateEmail: "هذا البريد مستخدم من قبل. جرّب تسجيل الدخول أو استخدم بريدًا آخر.",
    success: "تم 👌 خلنا نوريك أماكنك",
    priorityRequired: "اختر شيئًا واحدًا على الأقل.",
    priorityLimit: "اختر إلى 3 أشياء بس 👌",
    locationRequired: "حدد المنطقة أو استخدم موقعك للمتابعة.",
    signupTab: "حساب جديد",
    loginTab: "تسجيل الدخول",
    loginDescription: "عندك حساب؟ ادخل ونرجع لك جلستك بدون ما تضيع اختياراتك.",
    login: "ادخل حسابي",
    loggingIn: "نسجّل دخولك…",
    wrongCredentials: "الإيميل أو الباسورد مو صحيح.",
    networkError: "صار شي بسيط، جرّب مرة ثانية.",
    confirmEmailTitle: "باقي تأكيد بسيط ✉️",
    confirmEmailDescription: "أرسلنا لك رابط تأكيد على إيميلك. افتحه ونكمل مباشرة لأماكنك.",
    sessionSaveError: "ما قدرنا نحفظ جلستك، جرّب مرة ثانية.",
  },
  en: {
    intro:
      "A few quick questions to set your preferences once, then we’ll find a place that fits this session. 🧠✨",
    start: "Let’s go 🚀",
    back: "Back",
    continue: "Continue",
    progress: (step: number) => `${step} of 6`,
    cityTitle: "Where are you focusing today? 📍",
    sessionTitle: "What kind of session is it? 🧠",
    timeTitle: "When are you going? ⏰",
    prioritiesTitle: "What matters most to you? ✨",
    prioritiesHint: "Choose up to 3",
    locationTitle: "Where should we look? 📍",
    radiusTitle: "How far are you willing to go? 🚗",
    areaPlaceholder: "Type an area or neighborhood",
    locationRequesting: "Getting your location…",
    locationDenied: "We couldn’t access your location. Choose an area instead 👀",
    locationReady: "Location ready 📍",
    matchingTitle: "Finding your spot… ✨",
    matchingSteps: [
      "🤫 Checking quietness",
      "🔌 Looking for outlets",
      "📶 Comparing Wi-Fi",
      "📍 Sorting nearby places",
    ],
    teaserTitle: "Your choices are ready 🎯",
    teaserDescription: "Create your account and we’ll rank the available places for this session.",
    teaserMatch: "We’ll use these for this session",
    reveal: "Show my places",
    signupTitle: "Your spots are ready ✨",
    signupDescription:
      "Create an account to reveal your best matches and save this session for next time.",
    username: "Username",
    usernameNote: "Your username must be unique and use English characters.",
    email: "Email",
    password: "Password",
    passwordHint: "8 characters or more 🔐",
    showPassword: "Show",
    hidePassword: "Hide",
    checking: "Checking…",
    available: "Available ✅",
    taken: "Taken 👀 Try another",
    invalidUsername: "Use 3–20 English letters, numbers, dots, or underscores.",
    invalidEmail: "Check your email address.",
    invalidPassword: "Your password must be at least 8 characters.",
    createAccount: "Create my account",
    creating: "Creating your account…",
    signupError: "We couldn’t create your account. Please try again.",
    duplicateEmail: "That email is already in use. Try signing in or use another email.",
    success: "You're in 👌 Let’s show you your matches",
    priorityRequired: "Choose at least one priority.",
    priorityLimit: "Choose up to 3 only 👌",
    locationRequired: "Choose an area or share your location to continue.",
    signupTab: "Sign up",
    loginTab: "Log in",
    loginDescription: "Already have an account? Log in and we’ll keep this session with you.",
    login: "Log in",
    loggingIn: "Logging you in…",
    wrongCredentials: "That email or password isn’t right.",
    networkError: "Something went wrong. Please try again.",
    confirmEmailTitle: "One quick confirmation ✉️",
    confirmEmailDescription:
      "We sent a confirmation link to your email. Open it and we’ll take you straight to your matches.",
    sessionSaveError: "We couldn’t save this session. Please try again.",
  },
};

export function getFindCopy(locale: Locale) {
  return common[locale];
}

export const cityChoices: Record<Locale, Choice<City>[]> = {
  ar: [
    { value: "riyadh", label: "🏙️ الرياض" },
    { value: "majmaah", label: "🌿 المجمعة" },
  ],
  en: [
    { value: "riyadh", label: "🏙️ Riyadh" },
    { value: "majmaah", label: "🌿 Al Majma’ah" },
  ],
};

export const sessionChoices: Record<Locale, Choice<SessionType>[]> = {
  ar: [
    { value: "deep-focus", label: "🧠 تركيز عميق", description: "مذاكرة جدية، أقل تشتيت ممكن." },
    {
      value: "group-study",
      label: "👥 مذاكرة مع القروب",
      description: "نقاش، مراجعة، وقعدة جماعية.",
    },
    {
      value: "remote-work",
      label: "💻 شغل أو Remote Work",
      description: "لابتوب، إنجاز، ويمكن كم مكالمة.",
    },
    { value: "quick-study", label: "⚡ جلسة سريعة", description: "ساعة أو أقل ونبي ننجز." },
  ],
  en: [
    {
      value: "deep-focus",
      label: "🧠 Deep Focus",
      description: "Serious study with minimal distractions.",
    },
    {
      value: "group-study",
      label: "👥 Group Study",
      description: "Discussion, revision and studying together.",
    },
    {
      value: "remote-work",
      label: "💻 Remote Work",
      description: "Laptop work, productivity and maybe a call.",
    },
    {
      value: "quick-study",
      label: "⚡ Quick Study",
      description: "Short session, maximum productivity.",
    },
  ],
};

export const timeChoices: Record<Locale, Choice<VisitTime>[]> = {
  ar: [
    { value: "now", label: "⚡ الحين" },
    { value: "morning", label: "🌅 الصباح" },
    { value: "afternoon", label: "☀️ الظهر / العصر" },
    { value: "evening", label: "🌆 المساء" },
    { value: "late-night", label: "🌙 آخر الليل" },
  ],
  en: [
    { value: "now", label: "⚡ Now" },
    { value: "morning", label: "🌅 Morning" },
    { value: "afternoon", label: "☀️ Afternoon" },
    { value: "evening", label: "🌆 Evening" },
    { value: "late-night", label: "🌙 Late night" },
  ],
};

export const priorityChoices: Record<Locale, Choice<Priority>[]> = {
  ar: [
    { value: "quiet", label: "🤫 هدوء" },
    { value: "outlets", label: "🔌 أفياش كثيرة" },
    { value: "wifi", label: "📶 Wi-Fi مضبوط" },
    { value: "comfort", label: "🪑 جلسات مريحة" },
    { value: "parking", label: "🚗 مواقف سهلة" },
    { value: "budget", label: "💸 سعر معقول" },
    { value: "long-stay", label: "🕐 مناسب للجلسة الطويلة" },
    { value: "coffee", label: "☕ قهوة كويسة" },
    { value: "food", label: "🍽️ فيه أكل" },
    { value: "restrooms", label: "🚻 دورات مياه كويسة" },
  ],
  en: [
    { value: "quiet", label: "🤫 Quiet" },
    { value: "outlets", label: "🔌 Plenty of outlets" },
    { value: "wifi", label: "📶 Reliable Wi-Fi" },
    { value: "comfort", label: "🪑 Comfortable seating" },
    { value: "parking", label: "🚗 Easy parking" },
    { value: "budget", label: "💸 Good value" },
    { value: "long-stay", label: "🕐 Long-stay friendly" },
    { value: "coffee", label: "☕ Good coffee" },
    { value: "food", label: "🍽️ Food available" },
    { value: "restrooms", label: "🚻 Good restrooms" },
  ],
};

export function locationChoices(locale: Locale, city: City): Choice<LocationChoice>[] {
  const nearUniversity =
    city === "riyadh"
      ? locale === "ar"
        ? "🎓 حول جامعة الملك سعود"
        : "🎓 Near KSU"
      : locale === "ar"
        ? "🎓 حول جامعة المجمعة"
        : "🎓 Near Majma’ah University";
  const choices: Choice<LocationChoice>[] = [
    { value: "near-me", label: locale === "ar" ? "📍 قريب مني" : "📍 Near me" },
    { value: "university", label: nearUniversity },
  ];
  if (city === "riyadh")
    choices.push(
      {
        value: "north-riyadh",
        label: locale === "ar" ? "🌆 شمال الرياض" : "🌆 North Riyadh",
      },
      {
        value: "east-riyadh",
        label: locale === "ar" ? "🌇 شرق الرياض" : "🌇 East Riyadh",
      },
      {
        value: "central-riyadh",
        label: locale === "ar" ? "🌃 وسط الرياض" : "🌃 Central Riyadh",
      },
      {
        value: "west-riyadh",
        label: locale === "ar" ? "🌄 غرب الرياض" : "🌄 West Riyadh",
      },
      {
        value: "south-riyadh",
        label: locale === "ar" ? "🌴 جنوب الرياض" : "🌴 South Riyadh",
      },
    );
  choices.push({ value: "area", label: locale === "ar" ? "🗺️ اختر الحي" : "🗺️ Choose an area" });
  return choices;
}

export const radiusChoices: Record<Locale, Choice<RadiusChoice>[]> = {
  ar: [
    { value: "5", label: "5 دقايق" },
    { value: "10", label: "10 دقايق" },
    { value: "20", label: "20 دقيقة" },
    { value: "reasonable", label: "ما يفرق كثير" },
  ],
  en: [
    { value: "5", label: "5 min" },
    { value: "10", label: "10 min" },
    { value: "20", label: "20 min" },
    { value: "reasonable", label: "Anywhere reasonable" },
  ],
};

export function contextualQuestion(locale: Locale, sessionType: SessionType) {
  if (sessionType === "group-study")
    return {
      title: locale === "ar" ? "كم عددكم؟ 👥" : "How many of you? 👥",
      options: locale === "ar" ? ["2", "3–4", "+5"] : ["2", "3–4", "5+"],
    };
  if (sessionType === "quick-study")
    return {
      title: locale === "ar" ? "كم عندك وقت؟ ⚡" : "How much time do you have? ⚡",
      options:
        locale === "ar"
          ? ["أقل من 30 دقيقة", "30–60 دقيقة", "1–2 ساعة"]
          : ["Under 30 min", "30–60 min", "1–2h"],
    };
  if (sessionType === "remote-work")
    return {
      title: locale === "ar" ? "كم ناوي تشتغل؟ 💻" : "How long will you work? 💻",
      options:
        locale === "ar" ? ["أقل من ساعتين", "2–4 ساعات", "+4 ساعات"] : ["Under 2h", "2–4h", "4h+"],
    };
  return {
    title: locale === "ar" ? "كم تتوقع تجلس؟ ⏳" : "How long are you staying? ⏳",
    options:
      locale === "ar"
        ? ["أقل من ساعة", "1–2 ساعة", "2–4 ساعات", "+4 ساعات"]
        : ["<1h", "1–2h", "2–4h", "4h+"],
  };
}
