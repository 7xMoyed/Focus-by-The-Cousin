"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import type { City } from "@/features/find/types";
import { useLocale } from "@/features/i18n/locale-provider";
import type { FacilityKey } from "@/features/venues/facility-definitions";
import { RichVenueCard, type DisplayBranch } from "@/features/venues/rich-venue-card";

type Stage = "welcome" | "city" | "area" | "results";
type Sort = "best" | "rating" | "reviewed";

const guestKey = "focus-guest-welcome-v1";
const discoveryKey = "focus-location-discovery-v1";

export function LocationDiscovery() {
  const { locale } = useLocale();
  const { user, loading: authLoading, openAuth } = useAuth();
  const [stage, setStage] = useState<Stage>("welcome");
  const [city, setCity] = useState<City | null>(null);
  const [area, setArea] = useState("all");
  const [branches, setBranches] = useState<DisplayBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [facilities, setFacilities] = useState<FacilityKey[]>([]);
  const [sort, setSort] = useState<Sort>("best");
  const copy = locale === "ar" ? ar : en;

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(discoveryKey) ?? "null") as { city?: City; area?: string } | null;
        if (saved?.city) {
          setCity(saved.city);
          setArea(saved.area ?? "all");
          setStage("results");
        } else if (user || window.localStorage.getItem(guestKey) === "seen") {
          setStage("city");
        }
      } catch {
        setStage(user ? "city" : "welcome");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, user]);

  useEffect(() => {
    if (stage !== "results" || !city) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      void fetch(`/api/venues?city=${city}&limit=50`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((payload: { branches?: DisplayBranch[] }) => setBranches(payload.branches ?? []))
        .catch((reason: unknown) => {
          if ((reason as Error).name !== "AbortError") setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [city, stage]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    const rows = branches.filter((branch) => {
      const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
      if (area !== "all" && classifyArea(branch, city!) !== area) return false;
      if (facilities.some((key) => branch.enrichment?.facilities?.[key] !== "yes")) return false;
      if (!normalized) return true;
      return [venue?.name_ar, venue?.name_en, branch.name_ar, branch.name_en, branch.address_ar]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase(locale).includes(normalized));
    });
    if (sort === "rating") return [...rows].sort((a, b) => ratingOf(b) - ratingOf(a));
    if (sort === "reviewed") return [...rows].sort((a, b) => (b.evidence?.reviewCount ?? 0) - (a.evidence?.reviewCount ?? 0));
    return [...rows].sort((a, b) => confidenceOf(b) - confidenceOf(a));
  }, [area, branches, city, facilities, locale, query, sort]);

  function continueAsGuest() {
    window.localStorage.setItem(guestKey, "seen");
    setStage("city");
  }

  function chooseCity(value: City) {
    setCity(value);
    setArea("all");
    setStage("area");
  }

  function chooseArea(value: string) {
    if (!city) return;
    setArea(value);
    window.localStorage.setItem(discoveryKey, JSON.stringify({ city, area: value }));
    setStage("results");
  }

  if (authLoading) return <Panel><Skeleton /></Panel>;

  if (stage === "welcome") {
    return (
      <Panel narrow>
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[hsl(var(--focus-accent-soft))] text-3xl">☕</span>
          <h1 className="mt-6 text-3xl font-semibold">{copy.welcome}</h1>
          <p className="focus-muted-text mx-auto mt-3 max-w-md text-sm leading-7">{copy.welcomeDetail}</p>
          <button type="button" onClick={() => openAuth({ kind: "account" }, "signup")} className="find-primary-button mt-7 w-full">{copy.join}</button>
          <p className="focus-muted-text mt-2 text-xs leading-5">{copy.joinDetail}</p>
          <button type="button" onClick={continueAsGuest} className="focus-chip mt-5 w-full justify-center">{copy.guest}</button>
          <p className="focus-muted-text mt-2 text-xs leading-5">{copy.guestDetail}</p>
        </div>
      </Panel>
    );
  }

  if (stage === "city") {
    return (
      <Panel narrow>
        <StepHeader title={copy.cityTitle} subtitle={copy.cityDetail} />
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Choice emoji="🏙️" label={copy.riyadh} onClick={() => chooseCity("riyadh")} />
          <Choice emoji="🌿" label={copy.majmaah} onClick={() => chooseCity("majmaah")} />
        </div>
      </Panel>
    );
  }

  if (stage === "area" && city) {
    return (
      <Panel narrow>
        <button type="button" className="find-back-button" onClick={() => setStage("city")}>{locale === "ar" ? "→ رجوع" : "← Back"}</button>
        <StepHeader title={copy.areaTitle} subtitle={copy.areaDetail} />
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {areas[city][locale].map((item) => <Choice key={item.value} emoji={item.emoji} label={item.label} onClick={() => chooseArea(item.value)} />)}
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="focus-accent-text text-sm font-semibold">{copy.discoverEyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold">{copy.resultsTitle}</h1>
          <p className="focus-muted-text mt-2 text-sm">{copy.areaName(city!, area)}</p>
        </div>
        <button type="button" onClick={() => setStage("city")} className="focus-chip">📍 {copy.changeLocation}</button>
      </div>

      <div className="sticky top-3 z-20 mt-6 rounded-[1.4rem] border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.94)] p-3 shadow-lg backdrop-blur-xl">
        <label className="block">
          <span className="sr-only">{copy.search}</span>
          <input type="search" className="find-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" className="focus-chip" aria-pressed={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}>⚙️ {copy.filters}</button>
          <label className="focus-chip">
            {copy.sort}
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="bg-transparent outline-none">
              <option value="best">{copy.best}</option><option value="rating">{copy.highest}</option><option value="reviewed">{copy.mostReviewed}</option>
            </select>
          </label>
          {facilities.length ? <button type="button" onClick={() => setFacilities([])} className="focus-chip">✕ {copy.clear}</button> : null}
        </div>
        {filtersOpen ? (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[hsl(var(--border))] pt-3 sm:grid-cols-4">
            {filterOptions.map((item) => (
              <button key={item.key} type="button" aria-pressed={facilities.includes(item.key)} onClick={() => setFacilities((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])} className="focus-chip justify-center">
                {item.emoji} {item[locale]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="focus-muted-text text-sm">{copy.count(visible.length)}</p>
        {process.env.NEXT_PUBLIC_FOCUS_DISCOVERY_QUESTIONS_ENABLED === "true" ? <a href="/find?mode=session" className="focus-chip">🧠 {copy.quiz}</a> : null}
      </div>
      {loading ? <div className="mt-5 grid gap-5"><Skeleton /><Skeleton /></div> : null}
      {error ? <Empty title={copy.error} action={copy.retry} onClick={() => location.reload()} /> : null}
      {!loading && !error && visible.length === 0 ? <Empty title={copy.empty} action={copy.clear} onClick={() => { setFacilities([]); setQuery(""); setArea("all"); }} /> : null}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {visible.map((branch) => <RichVenueCard key={branch.id} branch={branch} locale={locale} />)}
      </div>
    </Panel>
  );
}

function Panel({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return <section className="focus-surface min-w-0 w-full overflow-x-clip rounded-[2rem] p-5 sm:p-8" style={{ maxWidth: narrow ? "min(calc(100vw - 2rem), 42rem)" : "min(calc(100vw - 2rem), 64rem)" }}>{children}</section>;
}
function StepHeader({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mt-3 text-center"><h1 className="text-3xl font-semibold">{title}</h1><p className="focus-muted-text mt-3 text-sm leading-7">{subtitle}</p></div>; }
function Choice({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="find-choice"><span className="text-2xl">{emoji}</span><span className="font-semibold">{label}</span></button>; }
function Skeleton() { return <div className="h-56 animate-pulse rounded-3xl bg-[hsl(var(--surface-soft))]" />; }
function Empty({ title, action, onClick }: { title: string; action: string; onClick: () => void }) { return <div className="mt-7 rounded-3xl bg-[hsl(var(--surface-soft))] p-8 text-center"><p>{title}</p><button type="button" onClick={onClick} className="focus-chip mt-4">{action}</button></div>; }

function classifyArea(branch: DisplayBranch, city: City) {
  if (city === "majmaah") {
    const text = `${branch.name_ar} ${branch.name_en} ${branch.address_ar ?? ""}`;
    if (/جامعة|university/i.test(text)) return "university";
    if (typeof branch.latitude === "number" && branch.latitude > 25.89 && branch.latitude < 25.93) return "center";
    return "other";
  }
  if (typeof branch.latitude !== "number" || typeof branch.longitude !== "number") return "unclassified";
  if (branch.latitude >= 24.72) return "north";
  if (branch.latitude < 24.64) return "south";
  if (branch.longitude >= 46.75) return "east";
  if (branch.longitude <= 46.62) return "west";
  return "center";
}
function ratingOf(branch: DisplayBranch) { return branch.enrichment?.preliminaryRating ?? -1; }
function confidenceOf(branch: DisplayBranch) { const reviews = branch.evidence?.reviewCount ?? 0; const rating = ratingOf(branch); return reviews * 3 + Math.max(0, rating); }

const filterOptions: Array<{ key: FacilityKey; emoji: string; ar: string; en: string }> = [
  { key: "quiet", emoji: "🤫", ar: "هدوء", en: "Quiet" }, { key: "wifi", emoji: "📶", ar: "Wi‑Fi", en: "Wi‑Fi" },
  { key: "outlets", emoji: "🔌", ar: "أفياش", en: "Outlets" }, { key: "seating", emoji: "🛋️", ar: "جلسات", en: "Seating" },
  { key: "parking", emoji: "🚗", ar: "مواقف", en: "Parking" }, { key: "study_friendly", emoji: "📚", ar: "للمذاكرة", en: "Study" },
  { key: "work_friendly", emoji: "💻", ar: "للعمل", en: "Laptop work" }, { key: "restrooms", emoji: "🚻", ar: "دورات مياه", en: "Restrooms" },
];

const areas = {
  riyadh: {
    ar: [{ value: "north", emoji: "⬆️", label: "شمال الرياض" }, { value: "east", emoji: "➡️", label: "شرق الرياض" }, { value: "west", emoji: "⬅️", label: "غرب الرياض" }, { value: "south", emoji: "⬇️", label: "جنوب الرياض" }, { value: "center", emoji: "🎯", label: "وسط الرياض" }, { value: "all", emoji: "✨", label: "ما تفرق، ورّني الأفضل" }],
    en: [{ value: "north", emoji: "⬆️", label: "North Riyadh" }, { value: "east", emoji: "➡️", label: "East Riyadh" }, { value: "west", emoji: "⬅️", label: "West Riyadh" }, { value: "south", emoji: "⬇️", label: "South Riyadh" }, { value: "center", emoji: "🎯", label: "Central Riyadh" }, { value: "all", emoji: "✨", label: "Anywhere — show me the best" }],
  },
  majmaah: {
    ar: [{ value: "center", emoji: "🎯", label: "وسط المجمعة" }, { value: "university", emoji: "🎓", label: "قرب الجامعة" }, { value: "other", emoji: "🗺️", label: "بقية الأحياء" }, { value: "all", emoji: "✨", label: "ما تفرق، ورّني الأفضل" }],
    en: [{ value: "center", emoji: "🎯", label: "Central Al Majma’ah" }, { value: "university", emoji: "🎓", label: "Near the university" }, { value: "other", emoji: "🗺️", label: "Other neighborhoods" }, { value: "all", emoji: "✨", label: "Anywhere — show me the best" }],
  },
};

const ar = {
  welcome: "حياك في Focus ☕", welcomeDetail: "اكتشف أفضل الأماكن للمذاكرة والشغل، واحفظ الأماكن اللي تعجبك، وخلّك جزء من مجتمع The Cousin.", join: "انضم لمجتمع The Cousin ✨", joinDetail: "احفظ مقاهيك المفضلة وخلّ أماكنك المميزة معك وين ما رحت.", guest: "أكمل كضيف 👀", guestDetail: "تقدر تتصفح المقاهي بكل حرية، والتسجيل متاح لك بأي وقت.",
  cityTitle: "وين ودّك تركز اليوم؟ ☕", cityDetail: "خلّنا نلقى لك المكان المناسب بدون أسئلة كثيرة.", riyadh: "الرياض", majmaah: "المجمعة", areaTitle: "أي جهة تناسبك؟ 📍", areaDetail: "اختر المنطقة، ونطلع لك الأماكن المنشورة والموثقة فيها.", discoverEyebrow: "اكتشف على طول", resultsTitle: "أماكن تستاهل جلستك", changeLocation: "غيّر الموقع", search: "ابحث باسم المقهى أو الحي", filters: "الفلاتر", sort: "الترتيب", best: "الأفضل", highest: "الأعلى تقييمًا", mostReviewed: "الأكثر مراجعات", clear: "مسح الكل", quiz: "اختبار المطابقة", error: "تعذر تحميل الأماكن الآن.", retry: "حاول مرة ثانية", empty: "ما لقينا أماكن تطابق هالفلاتر، جرّب توسّع بحثك شوي ☕", count: (n: number) => `${n} مكان`, areaName: (city: City, area: string) => `${city === "riyadh" ? "الرياض" : "المجمعة"} · ${area === "all" ? "الأفضل في المدينة" : "المنطقة المختارة"}`,
};
const en = {
  welcome: "Welcome to Focus ☕", welcomeDetail: "Discover excellent places to study and work, save your favorites, and join The Cousin community.", join: "Join The Cousin community ✨", joinDetail: "Save your favorite cafés and keep them with you everywhere.", guest: "Continue as guest 👀", guestDetail: "Browse freely. You can create an account anytime.",
  cityTitle: "Where would you like to focus today? ☕", cityDetail: "Let’s find the right place without lots of questions.", riyadh: "Riyadh", majmaah: "Al Majma’ah", areaTitle: "Which area works for you? 📍", areaDetail: "Choose an area and we’ll show published, verified places there.", discoverEyebrow: "Discover instantly", resultsTitle: "Places worth your session", changeLocation: "Change location", search: "Search by café or neighborhood", filters: "Filters", sort: "Sort", best: "Best", highest: "Highest rated", mostReviewed: "Most reviewed", clear: "Clear all", quiz: "Matching quiz", error: "Places are temporarily unavailable.", retry: "Try again", empty: "No places match those filters. Try widening your search ☕", count: (n: number) => `${n} places`, areaName: (city: City, area: string) => `${city === "riyadh" ? "Riyadh" : "Al Majma’ah"} · ${area === "all" ? "Best in the city" : "Selected area"}`,
};
