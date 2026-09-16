"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FloatingPanel } from "@/components/experience/floating-panel";
import {
  locationChoices,
  priorityChoices,
  radiusChoices,
  sessionChoices,
} from "@/features/find/find-copy";
import type {
  City,
  DiscoveryAnswers,
  FocusProfile,
  Priority,
  SessionFilters,
} from "@/features/find/types";
import { useLocale } from "@/features/i18n/locale-provider";
import { loadFocusProfile, updateFocusPreferences } from "@/features/preferences/focus-profile";
import { FocusPreferencesCard } from "@/features/results/focus-preferences-card";
import { SessionFilterPanel } from "@/features/results/session-filter-panel";
import { calculateFocusScore } from "@/lib/recommendations/focus-score";
import { calculateMatch, hasActiveMatchFilters } from "@/lib/recommendations/matching";
import type {
  ActiveMatchFilters,
  VenueDimension,
  VenueEvidence,
} from "@/lib/recommendations/types";
import { rankVenues } from "@/lib/recommendations/venue-ranking";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

const FILTER_STORAGE_KEY = "focus-active-filters-v1";

type Branch = {
  id: string;
  name_ar: string;
  name_en: string;
  address_ar: string | null;
  google_maps_url: string | null;
  average_spend_min: number | null;
  average_spend_max: number | null;
  evidence?: VenueEvidence;
  venues:
    | { name_ar: string; name_en: string; venue_type: string }
    | Array<{ name_ar: string; name_en: string; venue_type: string }>;
};

type SavedSession = { answers: DiscoveryAnswers };

export function DiscoveryResults() {
  const { locale } = useLocale();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<FocusProfile | null>(null);
  const [filters, setFilters] = useState<SessionFilters>({ priorities: [] });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const copy = locale === "ar" ? arabicCopy : englishCopy;
  const activeMatchFilters = useMemo<ActiveMatchFilters>(
    () => ({
      sessionType: filters.sessionType,
      priorities: filters.priorities,
      locationChoice: filters.locationChoice,
      radius: filters.radius,
    }),
    [filters],
  );
  const filtersActive = hasActiveMatchFilters(activeMatchFilters);
  const city: City = filters.city ?? profile?.preferredCity ?? "riyadh";
  const rankedBranches = useMemo(
    () => rankVenues(branches, activeMatchFilters),
    [activeMatchFilters, branches],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = getBrowserSupabaseClient();
      try {
        const { data: authData } = await supabase.auth.getSession();
        const user = authData.session?.user;
        if (!user) {
          router.replace("/find?auth=required");
          return;
        }

        const loadedProfile = await loadFocusProfile(supabase, user.id);
        if (!loadedProfile?.onboardingCompletedAt) {
          router.replace("/find");
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session");
        let loadedFilters: SessionFilters = { priorities: [] };

        if (sessionId && isUuid(sessionId)) {
          const { data, error } = await supabase
            .from("discovery_sessions")
            .select("answers")
            .eq("user_id", user.id)
            .eq("client_session_id", sessionId)
            .maybeSingle<SavedSession>();
          if (error) throw error;
          if (data) loadedFilters = filtersFromAnswers(data.answers);
        } else if (params.get("filters") === "active") {
          loadedFilters = readStoredFilters() ?? { priorities: [] };
        }

        if (cancelled) return;
        setUserId(user.id);
        setProfile(loadedProfile);
        setFilters(loadedFilters);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    void fetch(`/api/venues?city=${city}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: { branches?: Branch[] }) => setBranches(payload.branches ?? []))
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") {
          setBranches([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [city, profile]);

  const selectedFilterChips = [
    sessionChoices[locale].find((choice) => choice.value === filters.sessionType)?.label,
    ...priorityChoices[locale]
      .filter((choice) => filters.priorities.includes(choice.value))
      .map((choice) => choice.label),
    locationChoices(locale, city).find((choice) => choice.value === filters.locationChoice)?.label,
    radiusChoices[locale].find((choice) => choice.value === filters.radius)?.label,
  ].filter((value): value is string => Boolean(value));

  function applyFilters(nextFilters: SessionFilters) {
    setFilters(nextFilters);
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(nextFilters));
    window.history.replaceState(null, "", "/results?filters=active");
    setFilterOpen(false);
  }

  function clearFilters() {
    setFilters({ priorities: [] });
    window.localStorage.removeItem(FILTER_STORAGE_KEY);
    window.history.replaceState(null, "", "/results");
  }

  async function saveProfile(priorities: Priority[]) {
    if (!userId || !profile) return;
    await updateFocusPreferences(getBrowserSupabaseClient(), userId, priorities, locale);
    setProfile({ ...profile, preferredPriorities: priorities, preferredLanguage: locale });
  }

  async function logout() {
    await getBrowserSupabaseClient().auth.signOut();
    window.localStorage.removeItem(FILTER_STORAGE_KEY);
    router.push("/");
  }

  if (!profile && loadError) {
    return (
      <FloatingPanel>
        <EmptyState
          title={copy.loadError}
          action={copy.tryAgain}
          onAction={() => location.reload()}
        />
      </FloatingPanel>
    );
  }

  if (!profile) {
    return (
      <FloatingPanel>
        <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
      </FloatingPanel>
    );
  }

  return (
    <FloatingPanel>
      <div className="animate-find-step">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-sky-800">
            {filtersActive ? copy.filteredEyebrow : copy.browseEyebrow}
          </p>
          <button type="button" onClick={() => void logout()} className="find-back-button">
            {copy.logout}
          </button>
        </div>
        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {filtersActive ? copy.filteredTitle : copy.browseTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {filtersActive ? copy.filteredSubtitle : copy.browseSubtitle}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="find-primary-button min-h-11 text-xs"
          >
            {copy.filterAction}
          </button>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-full bg-slate-100 px-4 text-xs font-semibold text-slate-700"
            >
              {copy.clearFilters}
            </button>
          ) : null}
        </div>

        {filtersActive ? (
          <div className="mt-4 flex flex-wrap gap-2" aria-label={copy.activeFilters}>
            {selectedFilterChips.map((label) => (
              <span
                key={label}
                className="rounded-full bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <FocusPreferencesCard locale={locale} profile={profile} onSave={saveProfile} />
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-sky-800">{copy.cityLabel(city)}</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{copy.placesTitle}</h2>
            </div>
            {!filtersActive ? (
              <span className="text-xs text-slate-500">{copy.focusScoreNote}</span>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            {loading
              ? [0, 1].map((item) => (
                  <div key={item} className="h-48 animate-pulse rounded-3xl bg-slate-100" />
                ))
              : null}
            {!loading && loadError ? (
              <EmptyState
                title={copy.loadError}
                action={copy.tryAgain}
                onAction={() => location.reload()}
              />
            ) : null}
            {!loading && !loadError
              ? rankedBranches.map((branch) => (
                  <VenueCard
                    key={branch.id}
                    branch={branch}
                    locale={locale}
                    filters={activeMatchFilters}
                    filtered={filtersActive}
                  />
                ))
              : null}
            {!loading && !loadError && rankedBranches.length === 0 ? (
              <EmptyState
                title={filtersActive ? copy.filteredEmpty : copy.browseEmpty}
                action={filtersActive ? copy.widenSearch : copy.filterAction}
                onAction={() => (filtersActive ? clearFilters() : setFilterOpen(true))}
              />
            ) : null}
          </div>
        </section>
      </div>

      <SessionFilterPanel
        key={filterOpen ? "open" : "closed"}
        locale={locale}
        city={city}
        initialFilters={filters}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
      />
    </FloatingPanel>
  );
}

function VenueCard({
  branch,
  locale,
  filters,
  filtered,
}: {
  branch: Branch;
  locale: "ar" | "en";
  filters: ActiveMatchFilters;
  filtered: boolean;
}) {
  const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
  const venueName = locale === "ar" ? venue?.name_ar : venue?.name_en;
  const branchName = locale === "ar" ? branch.name_ar : branch.name_en;
  const focusScore = branch.evidence
    ? calculateFocusScore(branch.evidence)
    : { status: "insufficient-data" as const, reviewCount: 0 };
  const match = filtered && branch.evidence ? calculateMatch(branch.evidence, filters) : null;
  const dimensions = branch.evidence ? getVisibleDimensions(branch.evidence) : [];
  const bestFor = branch.evidence ? getBestFor(branch.evidence, locale) : [];
  const explanation = match ? buildExplanation(match.matchedDimensions, locale) : null;
  const copy =
    locale === "ar"
      ? {
          basedOn: "بناءً على اختياراتك",
          focusScore: "Focus Score",
          insufficient: "جديد 👀 نحتاج تقييمات أكثر",
          why: "ليش يناسبك؟ ✨",
          bestFor: "مناسب لـ",
          directions: "الاتجاهات ↗",
          spend: "متوسط الصرف",
        }
      : {
          basedOn: "Based on your choices",
          focusScore: "Focus Score",
          insufficient: "New 👀 More reviews needed",
          why: "Why it fits ✨",
          bestFor: "Best for",
          directions: "Directions ↗",
          spend: "Average spend",
        };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{venueName}</h3>
          <p className="mt-1 text-sm text-slate-500">{branchName}</p>
        </div>
        {match ? (
          <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-center">
            <strong className="block text-base text-emerald-800">🎯 {match.percent}%</strong>
            <span className="mt-0.5 block text-[0.65rem] text-emerald-700">{copy.basedOn}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
        {focusScore.status === "scored" ? (
          <p className="text-sm font-semibold text-slate-900">
            ⭐ {copy.focusScore} {focusScore.score.toFixed(1)} / 10
          </p>
        ) : (
          <p className="text-sm font-medium text-slate-600">{copy.insufficient}</p>
        )}
      </div>

      {dimensions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {dimensions.map((item) => (
            <span
              key={item.label}
              className="rounded-full bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200"
            >
              {item.label} {item.value.toFixed(1)}
            </span>
          ))}
        </div>
      ) : null}

      {bestFor.length ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          <strong className="text-slate-800">{copy.bestFor}:</strong> {bestFor.join(" · ")}
        </p>
      ) : null}
      {explanation ? (
        <div className="mt-4 rounded-2xl bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-950">{copy.why}</p>
          <p className="mt-1 text-sm leading-6 text-sky-900">{explanation}</p>
        </div>
      ) : null}
      {typeof branch.evidence?.distanceMinutes === "number" ? (
        <p className="mt-4 text-sm text-slate-600">📍 {branch.evidence.distanceMinutes} min</p>
      ) : null}
      {branch.average_spend_min !== null ? (
        <p className="mt-3 text-sm text-slate-600">
          💸 {copy.spend}: {branch.average_spend_min}
          {branch.average_spend_max ? `–${branch.average_spend_max}` : ""} SAR
        </p>
      ) : null}
      {branch.google_maps_url ? (
        <a
          href={branch.google_maps_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-10 items-center rounded-full bg-slate-100 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-200"
        >
          {copy.directions}
        </a>
      ) : null}
    </article>
  );
}

function EmptyState({
  title,
  action,
  onAction,
}: {
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-6 text-center">
      <p className="text-sm leading-7 text-slate-700">{title}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 min-h-10 rounded-full bg-white px-4 text-xs font-semibold text-sky-900 shadow-sm"
      >
        {action}
      </button>
    </div>
  );
}

function filtersFromAnswers(answers: DiscoveryAnswers): SessionFilters {
  return {
    city: answers.city,
    sessionType: answers.sessionType,
    priorities: answers.priorities,
    locationChoice: answers.locationChoice,
    radius: answers.radius,
    manualArea: answers.manualArea,
  };
}

function readStoredFilters(): SessionFilters | null {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(FILTER_STORAGE_KEY) ?? "null",
    ) as SessionFilters | null;
    if (!parsed || !Array.isArray(parsed.priorities) || parsed.priorities.length > 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getVisibleDimensions(evidence: VenueEvidence) {
  const labels: Partial<Record<VenueDimension, string>> = {
    quiet: "🤫",
    outlets: "🔌",
    wifi: "📶",
  };
  return (["quiet", "outlets", "wifi"] as VenueDimension[])
    .map((dimension) => ({
      label: labels[dimension] ?? "",
      value: evidence.dimensions[dimension],
    }))
    .filter((item): item is { label: string; value: number } => typeof item.value === "number");
}

function getBestFor(evidence: VenueEvidence, locale: "ar" | "en") {
  if (evidence.reviewCount < 5) return [];
  const labels = {
    "group-suitability": locale === "ar" ? "👥 مذاكرة جماعية" : "👥 Group Study",
    "remote-work-suitability": locale === "ar" ? "💻 شغل عن بعد" : "💻 Remote Work",
    "quick-session-suitability": locale === "ar" ? "⚡ جلسة سريعة" : "⚡ Quick Sessions",
    "deep-focus-suitability": locale === "ar" ? "🧠 تركيز عميق" : "🧠 Deep Focus",
  } as const;
  return (Object.entries(labels) as Array<[keyof typeof labels, string]>)
    .filter(([dimension]) => (evidence.dimensions[dimension] ?? 0) >= 8)
    .map(([, label]) => label)
    .slice(0, 2);
}

function buildExplanation(dimensions: VenueDimension[], locale: "ar" | "en") {
  if (!dimensions.length) return null;
  const phrases: Partial<Record<VenueDimension, { ar: string; en: string }>> = {
    quiet: { ar: "هادي", en: "quiet" },
    outlets: { ar: "فيه أفياش كثيرة", en: "plenty of outlets" },
    wifi: { ar: "النت مضبوط", en: "reliable Wi-Fi" },
    comfort: { ar: "جلساته مريحة", en: "comfortable seating" },
    parking: { ar: "مواقفه سهلة", en: "easy parking" },
    "long-stay": { ar: "مناسب للجلسات الطويلة", en: "good for long stays" },
    "group-suitability": { ar: "يناسب القروبات", en: "works well for groups" },
    "remote-work-suitability": { ar: "مناسب للشغل", en: "remote-work friendly" },
    "deep-focus-suitability": { ar: "مناسب للتركيز العميق", en: "great for deep focus" },
    "table-suitability": { ar: "طاولاته مناسبة", en: "study-friendly tables" },
  };
  const selected = dimensions
    .map((dimension) => phrases[dimension]?.[locale])
    .filter((value): value is string => Boolean(value));
  if (!selected.length) return null;
  return `${selected.join(locale === "ar" ? "، " : ", ")}.`;
}

const arabicCopy = {
  browseEyebrow: "اكتشف أماكن Focus",
  filteredEyebrow: "نتائج جلستك 🎯",
  browseTitle: "وين ودّك تركز اليوم؟",
  filteredTitle: "أماكن تناسب جلستك",
  browseSubtitle: "تصفح بهدوء، أو فلتر جلستك إذا عندك احتياج محدد اليوم.",
  filteredSubtitle: "الترتيب هنا مبني على الفلاتر المفعلة والبيانات المتاحة لكل فرع.",
  filterAction: "فلتر جلستك 🎯",
  clearFilters: "مسح الفلاتر",
  activeFilters: "الفلاتر المفعلة",
  logout: "تسجيل الخروج",
  placesTitle: "أماكن متاحة",
  focusScoreNote: "⭐ تقييم عام",
  cityLabel: (city: City) => (city === "riyadh" ? "الرياض" : "المجمعة"),
  filteredEmpty: "ما لقينا شي يطابق كل اختياراتك 👀",
  browseEmpty: "الأماكن لهالمدينة بتنزل هنا أول ما تكتمل بياناتها 👀",
  widenSearch: "وسع البحث شوي",
  loadError: "ما قدرنا نحمّل الأماكن الآن.",
  tryAgain: "جرّب مرة ثانية",
};

const englishCopy = {
  browseEyebrow: "Explore Focus places",
  filteredEyebrow: "Your session results 🎯",
  browseTitle: "Where do you want to focus today?",
  filteredTitle: "Places that fit this session",
  browseSubtitle: "Browse normally, or filter when you need something specific today.",
  filteredSubtitle:
    "Ranking uses your active filters and the structured data available for each branch.",
  filterAction: "Filter your session 🎯",
  clearFilters: "Clear filters",
  activeFilters: "Active filters",
  logout: "Log out",
  placesTitle: "Available places",
  focusScoreNote: "⭐ Overall quality",
  cityLabel: (city: City) => (city === "riyadh" ? "Riyadh" : "Al Majma’ah"),
  filteredEmpty: "No perfect match yet 👀",
  browseEmpty: "Places will appear here as soon as their data is ready 👀",
  widenSearch: "Try widening your search",
  loadError: "We couldn’t load places right now.",
  tryAgain: "Try again",
};
