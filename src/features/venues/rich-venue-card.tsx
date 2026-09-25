"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { calculateFocusScore } from "@/lib/recommendations/focus-score";
import { calculateMatch } from "@/lib/recommendations/matching";
import type { ActiveMatchFilters, VenueEvidence } from "@/lib/recommendations/types";
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
  average_spend_min: number | null;
  average_spend_max: number | null;
  evidence?: VenueEvidence;
  enrichment?: PublicVenueEnrichment | null;
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
  const displayedFacilities = facilityKeys.flatMap((key) => {
    const state = facilities[key];
    if (!state || (state === "no" && !facilityDefinition[key].usefulWhenNo)) return [];
    return [{ key, state }];
  });
  const bestFor = (enrichment?.bestFor ?? []).flatMap((key) =>
    key in bestForLabels ? [bestForLabels[key as keyof typeof bestForLabels][locale]] : [],
  );
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
        };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSaved(
          JSON.parse(window.localStorage.getItem("focus-saved-venues-v1") ?? "[]").includes(
            branch.id,
          ),
        );
      } catch {
        setSaved(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [branch.id]);

  function toggleSave() {
    let ids: string[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem("focus-saved-venues-v1") ?? "[]");
      if (Array.isArray(parsed)) {
        ids = parsed.filter((value): value is string => typeof value === "string");
      }
    } catch {
      // A malformed local list should not prevent saving this venue.
    }
    const next = ids.includes(branch.id)
      ? ids.filter((id) => id !== branch.id)
      : [...ids, branch.id];
    window.localStorage.setItem("focus-saved-venues-v1", JSON.stringify(next));
    setSaved(next.includes(branch.id));
  }

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white text-slate-950 shadow-[0_20px_55px_rgba(10,48,67,0.14)] ring-1 ring-slate-200/70">
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
              <p className="mt-0.5 truncate text-sm font-medium text-slate-500">{location}</p>
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

        <div className="flex items-end justify-between gap-3 border-y border-slate-100 py-3">
          {focusScore.status === "scored" ? (
            <div>
              <p className="text-xl font-semibold tracking-tight" dir="ltr">
                ⭐ {focusScore.score.toFixed(1)}/10
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{copy.focusScore}</p>
            </div>
          ) : typeof preliminaryRating === "number" ? (
            <div>
              <p className="text-xl font-semibold tracking-tight" dir="ltr">
                ⭐ {preliminaryRating.toFixed(1).replace(".0", "")}/10
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{copy.preliminary}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-[#0b5265]">{copy.new}</p>
          )}
          {bestFor.length ? (
            <p className="max-w-[55%] text-end text-xs leading-5 text-slate-600">
              <span className="font-semibold text-slate-800">{copy.promising}:</span>{" "}
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
                    state === "yes" ? "bg-[#eef7f5] text-[#174f4d]" : "bg-stone-100 text-stone-500"
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

        {summary ? (
          <div>
            <p className="text-xs font-semibold text-[#0b5265]">{copy.why}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{summary}</p>
          </div>
        ) : displayedFacilities.length === 0 ? (
          <p className="text-xs leading-5 text-slate-500">{copy.reviewing}</p>
        ) : null}

        <PlacePhotoStrip photos={displayPhotos} locale={locale} name={name} />

        {detailed && locale === "ar" && branch.address_ar ? (
          <p className="text-sm text-slate-500">📍 {branch.address_ar}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto_auto]">
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
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
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
                ? "border-[#9fc6c0] bg-[#e9f5f2] text-[#174f4d]"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <BookmarkIcon filled={saved} />
            {copy.save}
          </button>
        </div>
      </div>
    </article>
  );
}
