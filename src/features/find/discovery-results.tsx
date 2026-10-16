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
import { hasActiveMatchFilters } from "@/lib/recommendations/matching";
import { calculateFocusScore } from "@/lib/recommendations/focus-score";
import type { ActiveMatchFilters, VenueEvidence } from "@/lib/recommendations/types";
import { rankVenues } from "@/lib/recommendations/venue-ranking";
import { withTimeout } from "@/lib/async/with-timeout";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { PublicVenueEnrichment } from "@/features/venues/place-photo";
import { RichVenueCard } from "@/features/venues/rich-venue-card";

const FILTER_STORAGE_KEY = "focus-active-filters-v1";
const SEARCH_STORAGE_KEY = "focus-search-hub-v1";

type SortOption = "match" | "distance" | "rating" | "name";
type VenueTypeFilter = "all" | "cafe" | "library" | "coworking";
type MoodPreset = "detective" | "couch" | "quick" | "group" | "sunny" | "class";
type NearbyLocation = { latitude: number; longitude: number; expiresAt: number };

type Branch = {
  id: string;
  name_ar: string;
  name_en: string;
  address_ar: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  average_spend_min: number | null;
  average_spend_max: number | null;
  evidence?: VenueEvidence;
  enrichment?: PublicVenueEnrichment | null;
  opening_hours?: Array<{
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
  }>;
  slug: string;
  cities?:
    | { name_ar: string; name_en: string; slug: string }
    | Array<{ name_ar: string; name_en: string; slug: string }>;
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
  const [query, setQuery] = useState("");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("match");
  const [venueType, setVenueType] = useState<VenueTypeFilter>("all");
  const [searchReady, setSearchReady] = useState(false);
  const [activeMood, setActiveMood] = useState<MoodPreset | null>(null);
  const [nearbyLocation, setNearbyLocation] = useState<NearbyLocation | null>(null);

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
  const rankedBranches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale === "ar" ? "ar" : "en");
    const branchesWithDistance = branches.map((branch) => {
      if (
        !nearbyLocation ||
        typeof branch.latitude !== "number" ||
        typeof branch.longitude !== "number"
      ) {
        return branch;
      }
      const kilometers = distanceInKilometers(
        nearbyLocation.latitude,
        nearbyLocation.longitude,
        branch.latitude,
        branch.longitude,
      );
      return {
        ...branch,
        evidence: {
          ...(branch.evidence ?? { dimensions: {}, reviewCount: 0 }),
          distanceMinutes: Math.max(1, Math.round((kilometers / 35) * 60)),
        },
      };
    });
    const matchingBranches = branchesWithDistance.filter((branch) => {
      if (openNowOnly && !isBranchOpenNow(branch.opening_hours)) return false;
      const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
      if (venueType !== "all" && venue?.venue_type !== venueType) return false;
      if (activeMood === "sunny" && branch.enrichment?.facilities?.outdoor_seating !== "yes") {
        return false;
      }
      const maximumMinutes =
        filters.radius && filters.radius !== "reasonable" ? Number(filters.radius) : null;
      if (
        maximumMinutes &&
        typeof branch.evidence?.distanceMinutes === "number" &&
        branch.evidence.distanceMinutes > maximumMinutes
      ) {
        return false;
      }
      if (filters.locationChoice === "area" && filters.manualArea?.trim()) {
        const requestedArea = filters.manualArea.trim().toLocaleLowerCase(locale);
        const branchLocation = [branch.name_ar, branch.name_en, branch.address_ar]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale);
        if (!branchLocation.includes(requestedArea)) return false;
      }
      if (!normalizedQuery) return true;
      const cityValue = Array.isArray(branch.cities) ? branch.cities[0] : branch.cities;
      return [
        venue?.name_ar,
        venue?.name_en,
        branch.name_ar,
        branch.name_en,
        branch.address_ar,
        cityValue?.name_ar,
        cityValue?.name_en,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase(locale).includes(normalizedQuery));
    });
    const ranked = rankVenues(matchingBranches, activeMatchFilters);
    if (sort === "name") {
      return [...ranked].sort((a, b) => venueName(a, locale).localeCompare(venueName(b, locale)));
    }
    if (sort === "rating") {
      return [...ranked].sort((a, b) => venueRating(b) - venueRating(a));
    }
    if (sort === "distance") {
      return [...ranked].sort(
        (a, b) =>
          (a.evidence?.distanceMinutes ?? Number.POSITIVE_INFINITY) -
          (b.evidence?.distanceMinutes ?? Number.POSITIVE_INFINITY),
      );
    }
    return ranked;
  }, [
    activeMatchFilters,
    activeMood,
    branches,
    filters,
    locale,
    nearbyLocation,
    openNowOnly,
    query,
    sort,
    venueType,
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = getBrowserSupabaseClient();
      try {
        const { data: authData } = await withTimeout(supabase.auth.getSession(), 3500);
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
        } else {
          loadedFilters = {
            city: loadedProfile.preferredCity,
            sessionType: loadedProfile.preferredSessionType,
            priorities: loadedProfile.preferredPriorities,
          };
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
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(SEARCH_STORAGE_KEY) ?? "null") as {
          query?: string;
          openNowOnly?: boolean;
          sort?: SortOption;
          venueType?: VenueTypeFilter;
        } | null;
        if (saved?.query) setQuery(saved.query.slice(0, 80));
        if (saved?.openNowOnly) setOpenNowOnly(true);
        if (saved?.sort === "distance" || saved?.sort === "rating" || saved?.sort === "name") {
          setSort(saved.sort);
        }
        if (
          saved?.venueType === "cafe" ||
          saved?.venueType === "library" ||
          saved?.venueType === "coworking"
        ) {
          setVenueType(saved.venueType);
        }
      } catch {
        window.localStorage.removeItem(SEARCH_STORAGE_KEY);
      } finally {
        setSearchReady(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNearbyLocation(readNearbyLocation()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!searchReady) return;
    window.localStorage.setItem(
      SEARCH_STORAGE_KEY,
      JSON.stringify({ query, openNowOnly, sort, venueType }),
    );
  }, [openNowOnly, query, searchReady, sort, venueType]);

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
    const nextLocation = readNearbyLocation();
    setNearbyLocation(nextLocation);
    if (nextFilters.locationChoice === "near-me" && nextLocation) setSort("distance");
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(nextFilters));
    window.history.replaceState(null, "", "/results?filters=active");
    setFilterOpen(false);
  }

  function clearFilters() {
    setFilters({ priorities: [] });
    setActiveMood(null);
    window.localStorage.removeItem(FILTER_STORAGE_KEY);
    window.history.replaceState(null, "", "/results");
  }

  function applyMood(id: MoodPreset) {
    const nextMood = activeMood === id ? null : id;
    setActiveMood(nextMood);
    if (!nextMood) {
      clearFilters();
      return;
    }
    const nextFilters = moodFilters[nextMood];
    setFilters((current) => ({ ...current, ...nextFilters, city }));
    window.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({ ...filters, ...nextFilters, city }),
    );
    window.history.replaceState(null, "", "/results?filters=active");
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

        <div className="sticky top-3 z-20 mt-6 rounded-[1.4rem] border border-white/70 bg-[hsl(var(--surface-raised)/0.9)] p-3 shadow-[0_12px_38px_hsl(var(--shadow-color)/0.12)] backdrop-blur-xl">
          <label className="relative block">
            <span
              className="pointer-events-none absolute inset-y-0 start-4 grid place-items-center"
              aria-hidden="true"
            >
              🔎
            </span>
            <span className="sr-only">{copy.searchLabel}</span>
            <input
              type="search"
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="find-input min-h-12 ps-11 text-sm"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {moodPresets[locale].map((mood) => (
              <button
                key={mood.id}
                type="button"
                className="focus-chip"
                aria-pressed={activeMood === mood.id}
                onClick={() => applyMood(mood.id)}
              >
                <span aria-hidden="true">{mood.emoji}</span>
                {mood.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["riyadh", "majmaah"] as City[]).map((cityOption) => (
              <button
                key={cityOption}
                type="button"
                className="focus-chip min-h-10"
                aria-pressed={city === cityOption}
                onClick={() => setFilters((current) => ({ ...current, city: cityOption }))}
              >
                {copy.cityLabel(cityOption)}
              </button>
            ))}
            <button
              type="button"
              className="focus-chip min-h-10"
              aria-pressed={openNowOnly}
              onClick={() => setOpenNowOnly((value) => !value)}
            >
              <span aria-hidden="true">🟢</span>
              {copy.openNow}
            </button>
            <label className="flex min-h-10 items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] px-3 text-xs font-semibold">
              <span>{copy.typeLabel}</span>
              <select
                value={venueType}
                onChange={(event) => setVenueType(event.target.value as VenueTypeFilter)}
                className="bg-transparent outline-none"
              >
                <option value="all">{copy.typeAll}</option>
                <option value="cafe">{copy.typeCafe}</option>
                <option value="library">{copy.typeLibrary}</option>
                <option value="coworking">{copy.typeCoworking}</option>
              </select>
            </label>
            <label className="ms-auto flex min-h-10 items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] px-3 text-xs font-semibold">
              <span>{copy.sortLabel}</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="bg-transparent outline-none"
              >
                <option value="match">{copy.sortMatch}</option>
                <option value="distance" disabled={!nearbyLocation}>
                  {copy.sortDistance}
                </option>
                <option value="rating">{copy.sortRating}</option>
                <option value="name">{copy.sortName}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="find-primary-button min-h-11 text-xs"
          >
            {copy.filterAction}
          </button>
          <button
            type="button"
            onClick={() => router.push("/find?mode=session")}
            className="focus-chip min-h-11"
          >
            🧠 {copy.startQuiz}
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
              <h2 className="mt-1 text-xl font-semibold text-[hsl(var(--panel-foreground))]">
                {copy.placesTitle}
              </h2>
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
                  <RichVenueCard
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

const arabicCopy = {
  browseEyebrow: "اكتشف أماكن Focus",
  filteredEyebrow: "نتائج جلستك 🎯",
  browseTitle: "وين ودّك تركز اليوم؟",
  filteredTitle: "أماكن تناسب جلستك",
  browseSubtitle: "تصفح بهدوء، أو فلتر جلستك إذا عندك احتياج محدد اليوم.",
  filteredSubtitle: "الترتيب هنا مبني على الفلاتر المفعلة والبيانات المتاحة لكل فرع.",
  filterAction: "فلتر جلستك 🎯",
  startQuiz: "اختبار المطابقة",
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
  searchLabel: "ابحث عن مكان أو حي",
  searchPlaceholder: "اسم المكان أو الحي…",
  openNow: "مفتوح الآن",
  sortLabel: "رتّب:",
  sortMatch: "الأنسب",
  sortDistance: "الأقرب",
  sortRating: "الأعلى تقييمًا",
  sortName: "الاسم",
  typeLabel: "النوع:",
  typeAll: "الكل",
  typeCafe: "مقهى",
  typeLibrary: "مكتبة",
  typeCoworking: "عمل مشترك",
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
  startQuiz: "Matching quiz",
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
  searchLabel: "Search for a place or neighborhood",
  searchPlaceholder: "Place or neighborhood…",
  openNow: "Open now",
  sortLabel: "Sort:",
  sortMatch: "Best match",
  sortDistance: "Nearest",
  sortRating: "Top rated",
  sortName: "Name",
  typeLabel: "Type:",
  typeAll: "All",
  typeCafe: "Cafe",
  typeLibrary: "Library",
  typeCoworking: "Coworking",
};

const moodFilters: Record<MoodPreset, Partial<SessionFilters>> = {
  detective: { sessionType: "deep-focus", priorities: ["quiet", "outlets", "wifi"] },
  couch: { sessionType: "light-study", priorities: ["comfort", "long-stay", "restrooms"] },
  quick: { sessionType: "quick-study", priorities: ["parking", "outlets", "coffee"], radius: "10" },
  group: { sessionType: "group-study", priorities: ["comfort", "food", "wifi"] },
  sunny: { sessionType: "light-study", priorities: ["comfort", "coffee", "parking"] },
  class: { sessionType: "online-class", priorities: ["wifi", "outlets", "quiet"] },
};

const moodPresets: Record<"ar" | "en", Array<{ id: MoodPreset; emoji: string; label: string }>> = {
  ar: [
    { id: "detective", emoji: "🕵️", label: "وضع المحقق" },
    { id: "couch", emoji: "🛋️", label: "جلسة طويلة" },
    { id: "quick", emoji: "⚡", label: "إنجاز سريع" },
    { id: "group", emoji: "👥", label: "مع القروب" },
    { id: "sunny", emoji: "🌤️", label: "جو حلو" },
    { id: "class", emoji: "🎧", label: "كلاس أو اجتماع" },
  ],
  en: [
    { id: "detective", emoji: "🕵️", label: "Detective mode" },
    { id: "couch", emoji: "🛋️", label: "Long session" },
    { id: "quick", emoji: "⚡", label: "Quick win" },
    { id: "group", emoji: "👥", label: "With the group" },
    { id: "sunny", emoji: "🌤️", label: "Good vibes" },
    { id: "class", emoji: "🎧", label: "Class or call" },
  ],
};

function venueName(branch: Branch, locale: "ar" | "en") {
  const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
  return (locale === "ar" ? venue?.name_ar : venue?.name_en) || venue?.name_en || "";
}

function venueRating(branch: Branch) {
  const score = branch.evidence ? calculateFocusScore(branch.evidence) : null;
  if (score?.status === "scored") return score.score;
  return branch.enrichment?.preliminaryRating ?? -1;
}

function isBranchOpenNow(hours: Branch["opening_hours"]) {
  if (!hours?.length) return false;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const today = hours.find((item) => item.day_of_week === dayMap[parts.weekday]);
  if (!today || today.is_closed || !today.opens_at || !today.closes_at) return false;
  const current = `${parts.hour}:${parts.minute}`;
  const opensAt = today.opens_at.slice(0, 5);
  const closesAt = today.closes_at.slice(0, 5);
  if (closesAt < opensAt) return current >= opensAt || current < closesAt;
  return current >= opensAt && current < closesAt;
}

function readNearbyLocation(): NearbyLocation | null {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem("focus-nearby-location-v1") ?? "null",
    ) as NearbyLocation | null;
    if (
      !value ||
      value.expiresAt <= Date.now() ||
      !Number.isFinite(value.latitude) ||
      !Number.isFinite(value.longitude)
    ) {
      window.sessionStorage.removeItem("focus-nearby-location-v1");
      return null;
    }
    return value;
  } catch {
    window.sessionStorage.removeItem("focus-nearby-location-v1");
    return null;
  }
}

function distanceInKilometers(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
