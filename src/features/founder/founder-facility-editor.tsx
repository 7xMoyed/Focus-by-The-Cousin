"use client";

import { useMemo, useState } from "react";

import type { VenueCandidate } from "@/features/venue-research/types";
import {
  facilityDefinition,
  facilityKeys,
  type FacilityKey,
  type FacilityState,
} from "@/features/venues/facility-definitions";

type FacilityDraft = {
  proposedState: FacilityState;
  confirmedState: FacilityState;
  evidence: string;
  sourceUrl: string;
};

function buildDrafts(candidate: VenueCandidate): Record<FacilityKey, FacilityDraft> {
  return Object.fromEntries(
    facilityKeys.map((key) => {
      const current = candidate.venue_candidate_facilities.find(
        (facility) => facility.facility_key === key,
      );
      return [
        key,
        {
          proposedState: current?.proposed_state ?? "unknown",
          confirmedState: current?.confirmed_state ?? "unknown",
          evidence: current?.evidence_summary ?? "",
          sourceUrl: current?.source_url ?? "",
        },
      ];
    }),
  ) as Record<FacilityKey, FacilityDraft>;
}

export function FounderFacilityEditor({
  candidate,
  locale,
  onUpdated,
}: {
  candidate: VenueCandidate;
  locale: "ar" | "en";
  onUpdated: () => Promise<void>;
}) {
  const copy = locale === "ar" ? arabicCopy : englishCopy;
  const [drafts, setDrafts] = useState(() => buildDrafts(candidate));
  const [rating, setRating] = useState(candidate.public_preliminary_rating?.toString() ?? "");
  const [ratingApproved, setRatingApproved] = useState(
    candidate.public_preliminary_rating_approved,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const canPublishRating =
    candidate.status === "approved" &&
    candidate.approved_for_publication &&
    candidate.confidence !== "low";
  const confirmedCount = useMemo(
    () => Object.values(drafts).filter((item) => item.confirmedState !== "unknown").length,
    [drafts],
  );

  function updateDraft(key: FacilityKey, patch: Partial<FacilityDraft>) {
    setDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }

  async function save() {
    const numericRating = rating.trim() ? Number(rating) : null;
    if (
      numericRating !== null &&
      (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 10)
    ) {
      setMessage(copy.invalidRating);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/founder/update-candidate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          cardFields: {
            preliminaryRating: numericRating,
            preliminaryRatingApproved: ratingApproved,
            facilities: facilityKeys.map((key) => ({
              key,
              proposedState: drafts[key].proposedState,
              confirmedState: drafts[key].confirmedState,
              evidence: drafts[key].evidence,
              sourceUrl: drafts[key].sourceUrl,
            })),
          },
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "save_failed");
      setMessage(copy.saved);
      await onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? `${copy.saveError}: ${error.message}` : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-950">{copy.ratingTitle}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {copy.ratingDetail} {copy.internalSeed}:{" "}
              {(candidate.focus_eligibility / 10).toFixed(1)}/10
            </p>
          </div>
          <input
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            placeholder="— / 10"
            className="w-28 rounded-xl border border-sky-200 bg-white px-3 py-2 text-center text-sm font-semibold"
            dir="ltr"
          />
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-700">
          <input
            type="checkbox"
            checked={ratingApproved}
            disabled={!canPublishRating || !rating}
            onChange={(event) => setRatingApproved(event.target.checked)}
            className="mt-1"
          />
          <span>
            {copy.publishRating}
            {!canPublishRating ? (
              <span className="block text-amber-700">{copy.ratingBlocked}</span>
            ) : null}
          </span>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {facilityKeys.map((key) => {
          const definition = facilityDefinition[key];
          const draft = drafts[key];
          return (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">
                  <span aria-hidden="true">{definition.icon}</span> {definition[locale]}
                </p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                  {copy.proposed}: {copy.state[draft.proposedState]}
                </span>
              </div>
              <label className="mt-3 block text-xs font-semibold text-slate-600">
                {copy.confirmed}
                <select
                  value={draft.confirmedState}
                  onChange={(event) =>
                    updateDraft(key, { confirmedState: event.target.value as FacilityState })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="unknown">{copy.state.unknown}</option>
                  <option value="yes">{copy.state.yes}</option>
                  <option value="no">{copy.state.no}</option>
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-600">
                {copy.evidence}
                <textarea
                  rows={2}
                  value={draft.evidence}
                  onChange={(event) => updateDraft(key, { evidence: event.target.value })}
                  placeholder={copy.evidencePlaceholder}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800"
                />
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-600">
                {copy.source}
                <input
                  type="url"
                  value={draft.sourceUrl}
                  onChange={(event) => updateDraft(key, { sourceUrl: event.target.value })}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  dir="ltr"
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {copy.confirmedCount}: {confirmedCount} / {facilityKeys.length}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? copy.saving : copy.save}
        </button>
      </div>
      {message ? <p className="text-xs font-medium text-sky-800">{message}</p> : null}
    </div>
  );
}

const arabicCopy = {
  ratingTitle: "التقييم المبدئي العام",
  ratingDetail: "رقم منفصل عن Focus Score، ولا يظهر إلا بعد اعتماد صريح وثقة كافية.",
  internalSeed: "درجة البحث الداخلية",
  publishRating: "اعرض الرقم للعامة كتقييم مبدئي",
  ratingBlocked: "يلزم نشر المرشح أولًا ورفع الثقة إلى متوسطة أو عالية.",
  invalidRating: "التقييم المبدئي يجب أن يكون بين 1 و10.",
  proposed: "اقتراح الوكيل",
  confirmed: "قرار المؤسس",
  evidence: "الدليل والسبب",
  evidencePlaceholder: "وش الدليل؟ صورة معتمدة، مراجعة محددة، أو مصدر رسمي…",
  source: "رابط المصدر",
  confirmedCount: "خصائص محسومة",
  save: "حفظ خصائص البطاقة",
  saving: "جاري الحفظ…",
  saved: "تم حفظ خصائص البطاقة.",
  saveError: "تعذر الحفظ",
  state: { yes: "نعم", no: "لا", unknown: "غير معروف" },
};

const englishCopy = {
  ratingTitle: "Public preliminary rating",
  ratingDetail:
    "Separate from Focus Score; shown only after explicit approval and sufficient confidence.",
  internalSeed: "Internal research seed",
  publishRating: "Show this publicly as a preliminary rating",
  ratingBlocked: "Publish the candidate first and use medium or high confidence.",
  invalidRating: "The preliminary rating must be between 1 and 10.",
  proposed: "Agent proposal",
  confirmed: "Founder decision",
  evidence: "Evidence and rationale",
  evidencePlaceholder: "Cite an approved image, a specific review, or an official source…",
  source: "Source URL",
  confirmedCount: "Resolved facilities",
  save: "Save card fields",
  saving: "Saving…",
  saved: "Card fields saved.",
  saveError: "Could not save",
  state: { yes: "Yes", no: "No", unknown: "Unknown" },
};
