"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ActiveMatchFilters, VenueEvidence } from "@/lib/recommendations/types";
import { calculateFocusScore } from "@/lib/recommendations/focus-score";
import { calculateMatch } from "@/lib/recommendations/matching";
import { weeProvidedPhotos, type PublicVenueEnrichment } from "./place-photo";
import { PlaceGallery, usePlaceGallery } from "./place-gallery";

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

const signalLabels = {
  tables: { ar: "🪑 طاولات للعمل", en: "🪑 Work tables" },
  seating: { ar: "✨ جلسات داخلية", en: "✨ Indoor seating" },
  wifi: { ar: "📶 Wi-Fi", en: "📶 Wi-Fi" },
  outlets: { ar: "🔌 أفياش", en: "🔌 Outlets" },
} as const;

const bestForLabels = {
  remote_work: { ar: "💻 شغل", en: "💻 Remote work" },
  deep_focus: { ar: "🧠 تركيز", en: "🧠 Deep focus" },
  group_study: { ar: "👥 قروب", en: "👥 Group study" },
  quick_study: { ar: "⚡ جلسة سريعة", en: "⚡ Quick session" },
} as const;

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
  const verifiedArabicName = branch.slug === "wee-riyadh" && locale === "ar" ? "ووي" : null;
  const location = [
    locale === "ar" ? branch.name_ar : branch.name_en,
    locale === "ar" ? city?.name_ar : city?.name_en,
  ]
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
  const signals = (enrichment?.signals ?? []).flatMap((key) =>
    key in signalLabels ? [signalLabels[key as keyof typeof signalLabels][locale]] : [],
  );
  const bestFor = (enrichment?.bestFor ?? []).flatMap((key) =>
    key in bestForLabels ? [bestForLabels[key as keyof typeof bestForLabels][locale]] : [],
  );
  const copy =
    locale === "ar"
      ? {
          new: "جديد على Focus 👀",
          reviews: "نحتاج تقييمات أكثر عشان نحسب Focus Score.",
          promising: "مبدئيًا مناسب لـ",
          why: "ليش لفت انتباهنا؟ ✨",
          reviewing: "نراجع صور المكان وتفاصيله قبل إضافة إشارات Focus.",
          view: "عرض المكان",
          save: saved ? "♥ محفوظ" : "♡ حفظ",
          directions: "الاتجاهات ↗",
          sourcePhotos: "شوف صور المكان على Corner ↗",
          match: "بناءً على جلستك",
        }
      : {
          new: "New on Focus 👀",
          reviews: "We need more reviews before calculating a Focus Score.",
          promising: "Looks promising for",
          why: "Why it caught our eye ✨",
          reviewing: "We’re reviewing place photos and details before adding Focus signals.",
          view: "View place",
          save: saved ? "♥ Saved" : "♡ Save",
          directions: "Directions ↗",
          sourcePhotos: "See place photos on Corner ↗",
          match: "Based on your session",
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
      if (Array.isArray(parsed))
        ids = parsed.filter((value): value is string => typeof value === "string");
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
    <article className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white text-slate-950 shadow-[0_18px_45px_rgba(10,48,67,0.12)]">
      <PlaceGallery
        photos={displayPhotos}
        locale={locale}
        name={name}
        detailHref={detailed ? undefined : detailHref}
        expanded={detailed}
      />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {branch.slug === "wee-riyadh" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/venues/wee/logo.jpg"
                alt="WEE"
                className="mb-2 h-12 w-12 rounded-full border border-slate-100 object-cover"
              />
            ) : null}
            {detailed ? (
              <h1
                className="text-2xl font-semibold tracking-tight"
                dir={name === "WEE" ? "ltr" : undefined}
              >
                {name}
                {verifiedArabicName ? (
                  <span className="ms-2 text-base font-medium text-slate-500">
                    {verifiedArabicName}
                  </span>
                ) : null}
              </h1>
            ) : (
              <Link
                href={detailHref}
                className="block text-2xl font-semibold tracking-tight hover:text-sky-800"
                dir={name === "WEE" ? "ltr" : undefined}
              >
                {name}
                {verifiedArabicName ? (
                  <span className="ms-2 text-base font-medium text-slate-500">
                    {verifiedArabicName}
                  </span>
                ) : null}
              </Link>
            )}
            <p className="mt-1 text-sm font-medium text-slate-500">{location}</p>
          </div>
          {match ? (
            <span className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800">
              <strong className="block text-base">🎯 {match.percent}%</strong>
              {copy.match}
            </span>
          ) : null}
        </div>
        <div className="rounded-2xl border border-sky-100 bg-[#edf7f9] px-4 py-3">
          {focusScore.status === "scored" ? (
            <p className="font-semibold">⭐ Focus Score {focusScore.score.toFixed(1)} / 10</p>
          ) : (
            <>
              <p className="font-semibold text-[#0b4559]">{copy.new}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{copy.reviews}</p>
            </>
          )}
        </div>
        {bestFor.length ? (
          <p className="text-sm leading-6">
            <span className="font-semibold">{copy.promising}</span> {bestFor.join(" · ")}
          </p>
        ) : null}
        {signals.length ? (
          <div className="flex flex-wrap gap-2">
            {signals.map((signal) => (
              <span
                key={signal}
                className="rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                {signal}
              </span>
            ))}
          </div>
        ) : null}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-[#0b4559]">{copy.why}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
            {summary || copy.reviewing}
          </p>
          {branch.slug === "wee-riyadh" && displayPhotos.length === 0 ? (
            <a
              href="https://www.corner.inc/place/pUAnAnNEt5Xt"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-sky-800 underline underline-offset-2"
            >
              {copy.sourcePhotos}
            </a>
          ) : null}
        </div>
        {detailed && branch.address_ar ? (
          <p className="text-sm text-slate-500">📍 {branch.address_ar}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {!detailed ? (
            <Link
              href={detailHref}
              className="find-primary-button min-h-11 flex-1 whitespace-nowrap text-xs"
            >
              {copy.view}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            className="min-h-11 rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-700"
          >
            {copy.save}
          </button>
          {branch.google_maps_url ? (
            <a
              href={branch.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 rounded-full border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600"
            >
              {copy.directions}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
