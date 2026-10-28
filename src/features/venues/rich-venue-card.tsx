"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearPendingAuthIntent,
  readPendingAuthIntent,
  useAuth,
} from "@/features/auth/auth-provider";
import { loadCommunityState, setVenueLiked } from "@/features/community/venue-community";
import { calculateFocusScore } from "@/lib/recommendations/focus-score";
import { calculateMatch } from "@/lib/recommendations/matching";
import type { ActiveMatchFilters, VenueEvidence } from "@/lib/recommendations/types";
import type { Priority } from "@/features/find/types";
import { loadSavedVenueIds, setVenueSaved } from "@/features/saved-venues/saved-venues";
import {
  facilityDefinition,
  facilityKeys,
  type FacilityKey,
  type PublicFacilityState,
} from "./facility-definitions";
import { PlaceGallery, PlacePhotoStrip, usePlaceGallery } from "./place-gallery";
import { weeProvidedPhotos, type PublicVenueEnrichment } from "./place-photo";

export type DisplayBranch = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  address_ar: string | null;
  google_maps_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  venues:
    | { name_ar: string; name_en: string; venue_type: string }
    | Array<{ name_ar: string; name_en: string; venue_type: string }>;
  cities?:
    | { name_ar: string; name_en: string; slug: string }
    | Array<{ name_ar: string; name_en: string; slug: string }>;
};

const bestForLabels = {
  remote_work: { ar: "💻 شغل", en: "💻 Remote work" },
  deep_focus: { ar: "🧠 تركيز", en: "🧠 Deep focus" },
  group_study: { ar: "👥 قروب", en: "👥 Group study" },
  quick_study: { ar: "⚡ جلسة سريعة", en: "⚡ Quick session" },
} as const;

const priorityFacility: Partial<Record<Priority, FacilityKey>> = {
  quiet: "quiet",
  outlets: "outlets",
  wifi: "wifi",
  comfort: "seating",
  parking: "parking",
  coffee: "coffee",
  food: "food",
  restrooms: "restrooms",
};

const sessionFacility: Partial<
  Record<NonNullable<ActiveMatchFilters["sessionType"]>, FacilityKey>
> = {
  "deep-focus": "study_friendly",
  "group-study": "group_friendly",
  "remote-work": "work_friendly",
  "online-class": "wifi",
  "light-study": "seating",
  "quick-study": "parking",
};

function legacyFacilities(signals: string[]): Partial<Record<FacilityKey, PublicFacilityState>> {
  const result: Partial<Record<FacilityKey, PublicFacilityState>> = {};
  if (signals.includes("tables") || signals.includes("seating")) result.seating = "yes";
  if (signals.includes("wifi")) result.wifi = "yes";
  if (signals.includes("outlets")) result.outlets = "yes";
  return result;
}

function cleanBranchName(value: string, locale: "ar" | "en") {
  return locale === "ar"
    ? value.replace(/^فرع\s+/u, "").trim()
    : value.replace(/\s+branch$/iu, "").trim();
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
    >
      <path
        d="M6.75 4.75A1.75 1.75 0 0 1 8.5 3h7A1.75 1.75 0 0 1 17.25 4.75v15.1L12 16.75l-5.25 3.1V4.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RichVenueCard({
  branch,
  locale,
  filters,
  filtered,
  detailed = false,
}: {
  branch: DisplayBranch;
  locale: "ar" | "en";
  filters?: ActiveMatchFilters;
  filtered?: boolean;
  detailed?: boolean;
}) {
  const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
  const city = Array.isArray(branch.cities) ? branch.cities[0] : branch.cities;
  const name =
    branch.slug === "wee-riyadh"
      ? "WEE"
      : (locale === "ar" ? venue?.name_ar : venue?.name_en) || venue?.name_en || "";
  const branchName = cleanBranchName(locale === "ar" ? branch.name_ar : branch.name_en, locale);
  const location = [branchName, locale === "ar" ? city?.name_ar : city?.name_en]
    .filter(Boolean)
    .join(" · ");
  const detailHref = `/places/${encodeURIComponent(branch.slug)}`;
  const { photos } = usePlaceGallery({ branch: branch.id });
  const displayPhotos = branch.slug === "wee-riyadh" ? weeProvidedPhotos : photos;
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const { user, loading: authLoading, openAuth } = useAuth();
  const focusScore = branch.evidence
    ? calculateFocusScore(branch.evidence)
    : { status: "insufficient-data" as const, reviewCount: 0 };
  const match =
    filtered && filters && branch.evidence && branch.evidence.reviewCount >= 5
      ? calculateMatch(branch.evidence, filters)
      : null;
  const enrichment = branch.enrichment;
  const summary = locale === "ar" ? enrichment?.summaryAr : enrichment?.summaryEn;
  const facilities = enrichment?.facilities ?? legacyFacilities(enrichment?.signals ?? []);
  const requestedFacilityKeys = [
    filters?.sessionType ? sessionFacility[filters.sessionType] : undefined,
    ...(filters?.priorities ?? []).map((priority) => priorityFacility[priority]),
  ].filter((key): key is FacilityKey => Boolean(key));
  const orderedFacilityKeys = [...new Set([...requestedFacilityKeys, ...facilityKeys])];
  const displayedFacilities = orderedFacilityKeys
    .flatMap((key) => {
      const state = facilities[key];
      if (!state || (state === "no" && !facilityDefinition[key].usefulWhenNo)) return [];
      return [{ key, state }];
    })
    .slice(0, 6);
  const bestFor = (enrichment?.bestFor ?? []).flatMap((key) =>
    key in bestForLabels ? [bestForLabels[key as keyof typeof bestForLabels][locale]] : [],
  );
  const factReasons = [...new Set(requestedFacilityKeys)]
    .filter((facilityKey) => facilities[facilityKey] === "yes")
    .map((facilityKey) => facilityDefinition[facilityKey][locale]);
  const openNow = isOpenNow(branch.opening_hours);
  const preliminaryRating = enrichment?.preliminaryRating;
  const copy =
    locale === "ar"
      ? {
          new: "جديد على Focus 👀",
          focusScore: "Focus Score من المجتمع",
          preliminary: "تقييم Focus المبدئي",
          promising: "يناسب غالبًا",
          why: "عن المكان",
          reviewing: "نراجع تفاصيل المكان ونضيف فقط المعلومات المدعومة بدليل.",
          view: "عرض المكان",
          save: saved ? "محفوظ" : "احفظها",
          directions: "الاتجاهات",
          match: "مناسب لجلستك",
          whyMatch: "ليش يناسبك",
          openNow: "مفتوح الآن",
          minutesAway: (minutes: number) => `حوالي ${minutes} دقيقة`,
          like: liked ? "أعجبك" : "إعجاب",
        }
      : {
          new: "New on Focus 👀",
          focusScore: "Community Focus Score",
          preliminary: "Preliminary Focus rating",
          promising: "Best suited for",
          why: "About this place",
          reviewing: "We’re reviewing the place and only add details supported by evidence.",
          view: "View place",
          save: saved ? "Saved" : "Save",
          directions: "Directions",
          match: "Fits your session",
          whyMatch: "Why it fits",
          openNow: "Open now",
          minutesAway: (minutes: number) => `About ${minutes} min away`,
          like: liked ? "Liked" : "Like",
        };

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => {
      try {
        void loadSavedVenueIds(Boolean(user?.id)).then((ids) => setSaved(ids.has(branch.id)));
      } catch {
        setSaved(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, branch.id, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    void loadCommunityState(branch.id, user?.id).then((state) => {
      if (!active) return;
      setLiked(state.liked);
      setLikeCount(state.count);
    });
    return () => {
      active = false;
    };
  }, [authLoading, branch.id, user?.id]);

  useEffect(() => {
    if (!user) return;
    const completePending = () => {
      const pending = readPendingAuthIntent();
      if (!pending || pending.branchId !== branch.id) return;
      clearPendingAuthIntent();
      if (pending.kind === "favorite") {
        setSaved(true);
        void setVenueSaved(branch.id, true).catch(() => setSaved(false));
      }
      if (pending.kind === "like") {
        setLiked(true);
        setLikeCount((value) => value + 1);
        void setVenueLiked(branch.id, user.id, true).catch(() => {
          setLiked(false);
          setLikeCount((value) => Math.max(0, value - 1));
        });
      }
    };
    completePending();
    window.addEventListener("focus:authenticated", completePending);
    return () => window.removeEventListener("focus:authenticated", completePending);
  }, [branch.id, user]);

  function toggleSave() {
    if (!user) {
      openAuth({ kind: "favorite", branchId: branch.id }, "signup");
      return;
    }
    const next = !saved;
    setSaved(next);
    void setVenueSaved(branch.id, next).catch(() => undefined);
  }

  function toggleLike() {
    if (!user) {
      openAuth({ kind: "like", branchId: branch.id });
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((value) => Math.max(0, value + (next ? 1 : -1)));
    void setVenueLiked(branch.id, user.id, next).catch(() => {
      setLiked(!next);
      setLikeCount((value) => Math.max(0, value + (next ? -1 : 1)));
    });
  }

  return (
    <article className="focus-surface overflow-hidden rounded-[1.75rem]">
      <PlaceGallery photos={displayPhotos} locale={locale} name={name} />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {branch.slug === "wee-riyadh" ? (
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm">
                <Image
                  src="/venues/wee/logo.jpg"
                  alt="WEE logo"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
            ) : null}
            <div className="min-w-0">
              {detailed ? (
                <h1
                  className="truncate text-2xl font-semibold tracking-tight"
                  dir={name === "WEE" ? "ltr" : undefined}
                >
                  {name}
                </h1>
              ) : (
                <Link
                  href={detailHref}
                  className="block truncate text-2xl font-semibold tracking-tight transition-colors hover:text-sky-800"
                  dir={name === "WEE" ? "ltr" : undefined}
                >
                  {name}
                </Link>
              )}
              <p className="focus-muted-text mt-0.5 truncate text-sm font-medium">{location}</p>
            </div>
          </div>
          {match ? (
            <span className="shrink-0 rounded-2xl bg-[#e9f5f2] px-3 py-2 text-center text-[11px] text-[#155c58]">
              <strong className="block text-sm" dir="ltr">
                🎯 {match.percent}%
              </strong>
              {copy.match}
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 border-y border-[hsl(var(--border)/0.55)] py-3">
          {focusScore.status === "scored" ? (
            <div>
              <p className="text-xl font-semibold tracking-tight" dir="ltr">
                ⭐ {focusScore.score.toFixed(1)}/10
              </p>
              <p className="focus-muted-text mt-0.5 text-[11px]">{copy.focusScore}</p>
            </div>
          ) : typeof preliminaryRating === "number" ? (
            <div>
              <p className="text-xl font-semibold tracking-tight" dir="ltr">
                ⭐ {preliminaryRating.toFixed(1).replace(".0", "")}/10
              </p>
              <p className="focus-muted-text mt-0.5 text-[11px]">{copy.preliminary}</p>
            </div>
          ) : (
            <p className="focus-accent-text text-sm font-semibold">{copy.new}</p>
          )}
          {bestFor.length ? (
            <p className="focus-muted-text max-w-[55%] text-end text-xs leading-5">
              <span className="font-semibold text-[hsl(var(--panel-foreground))]">
                {copy.promising}:
              </span>{" "}
              {bestFor.join(" · ")}
            </p>
          ) : null}
        </div>

        {displayedFacilities.length ? (
          <div
            className="grid grid-cols-2 gap-2"
            aria-label={locale === "ar" ? "مرافق المكان" : "Venue facilities"}
          >
            {displayedFacilities.map(({ key, state }) => {
              const definition = facilityDefinition[key];
              return (
                <div
                  key={key}
                  className={`flex min-h-9 items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium ${
                    displayedFacilities.length === 1 ? "col-span-2 max-w-[70%]" : ""
                  } ${
                    state === "yes"
                      ? "bg-[hsl(var(--focus-accent-soft))] text-[hsl(var(--focus-accent))]"
                      : "focus-soft-surface focus-muted-text"
                  }`}
                >
                  <span aria-hidden="true" className="text-[11px]">
                    {state === "yes" ? "✓" : "×"}
                  </span>
                  <span aria-hidden="true">{definition.icon}</span>
                  <span className="truncate">{definition[locale]}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {factReasons.length ? (
          <div className="rounded-2xl bg-[hsl(var(--focus-accent-soft))] px-3.5 py-3">
            <p className="text-[11px] font-semibold text-[hsl(var(--focus-accent))]">
              🎯 {copy.whyMatch}
            </p>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--panel-foreground))]">
              {factReasons.slice(0, 3).join(" · ")}
            </p>
          </div>
        ) : null}

        {summary ? (
          <div>
            <p className="focus-accent-text text-xs font-semibold">{copy.why}</p>
            <p className="focus-muted-text mt-1 line-clamp-2 text-sm leading-6">{summary}</p>
          </div>
        ) : displayedFacilities.length === 0 ? (
          <p className="focus-muted-text text-xs leading-5">{copy.reviewing}</p>
        ) : null}

        <PlacePhotoStrip photos={displayPhotos} locale={locale} name={name} />

        {detailed && locale === "ar" && branch.address_ar ? (
          <p className="focus-muted-text text-sm">📍 {branch.address_ar}</p>
        ) : null}

        {openNow === true ? (
          <p className="text-xs font-semibold text-[hsl(var(--focus-accent))]">● {copy.openNow}</p>
        ) : null}
        {typeof branch.evidence?.distanceMinutes === "number" ? (
          <p className="focus-muted-text text-xs">
            🚗 {copy.minutesAway(branch.evidence.distanceMinutes)}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t border-[hsl(var(--border)/0.55)] pt-4 sm:grid-cols-[1fr_auto_auto_auto]">
          {!detailed ? (
            <Link
              href={detailHref}
              className="find-primary-button col-span-2 min-h-11 text-xs sm:col-span-1 sm:px-5"
            >
              {copy.view}
            </Link>
          ) : null}
          {branch.google_maps_url ? (
            <a
              href={branch.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="focus-chip justify-center"
            >
              {copy.directions} ↗
            </a>
          ) : null}
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold transition-[transform,background-color,border-color,color] active:scale-95 motion-reduce:transition-none ${
              saved
                ? "border-[hsl(var(--focus-accent)/0.55)] bg-[hsl(var(--focus-accent-soft))] text-[hsl(var(--focus-accent))]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--panel-foreground))] hover:bg-[hsl(var(--surface-soft))]"
            }`}
          >
            <BookmarkIcon filled={saved} />
            {copy.save}
          </button>
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold transition-[transform,background-color,border-color,color] active:scale-95 motion-reduce:transition-none ${
              liked
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--panel-foreground))]"
            }`}
          >
            <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
            {copy.like}{likeCount > 0 ? ` · ${likeCount}` : ""}
          </button>
        </div>
      </div>
    </article>
  );
}

function isOpenNow(hours: DisplayBranch["opening_hours"]): boolean | null {
  if (!hours?.length) return null;
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
  if (!today || today.is_closed) return false;
  if (!today.opens_at || !today.closes_at) return null;
  const current = `${parts.hour}:${parts.minute}`;
  const opensAt = today.opens_at.slice(0, 5);
  const closesAt = today.closes_at.slice(0, 5);
  if (closesAt < opensAt) return current >= opensAt || current < closesAt;
  return current >= opensAt && current < closesAt;
}
