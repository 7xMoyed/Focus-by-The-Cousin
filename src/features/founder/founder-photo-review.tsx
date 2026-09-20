"use client";

import { useEffect, useState } from "react";

import type { VenueCandidate } from "@/features/venue-research/types";
import { PlaceGallery, usePlaceGallery } from "@/features/venues/place-gallery";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { moveFounderPhotoChoice, setFounderPhotoChoice } from "@/lib/supabase/founder-venues";

const categories = [
  "interior",
  "tables",
  "seating",
  "laptop",
  "outlets",
  "atmosphere",
  "outdoor",
  "exterior",
  "parking",
] as const;

export function FounderPhotoReview({
  candidate,
  locale,
  onUpdated,
}: {
  candidate: VenueCandidate;
  locale: "ar" | "en";
  onUpdated: () => Promise<void>;
}) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [relevance, setRelevance] = useState<Record<number, string>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const { photos, status } = usePlaceGallery({
    candidate: token && candidate.google_place_id ? candidate.id : undefined,
    token,
  });
  const copy =
    locale === "ar"
      ? {
          title: "معرض الصور العام المقترح",
          detail:
            "اختر الصور التي تساعد الزائر يتخيل جلسة التركيز. الصور وبيانات نسبتها تُجلب مباشرة من Google عند العرض.",
          noPlace: "معرّف Google Place لهذا الفرع غير مؤكد بعد؛ يلزم التحقق منه قبل اختيار الصور.",
          noKey: "صور Google غير متاحة الآن. فعّل Places API وأضف GOOGLE_PLACES_API_KEY للخادم.",
          empty: "لا توجد صور متاحة لهذا المكان عبر Places API.",
          preview: "المعرض المعتمد للعرض",
          approve: "اعتماد للصورة العامة",
          exclude: "استبعاد",
          up: "تقديم",
          down: "تأخير",
          pending: "لم تُراجع",
          approved: "معتمدة",
          excluded: "مستبعدة",
          choose: "اختر صلة الصورة بالتركيز",
          error: "تعذر حفظ قرار الصورة. حاول مرة ثانية.",
        }
      : {
          title: "Proposed public gallery",
          detail:
            "Choose photos that help visitors imagine a focused session. Photos and attribution are fetched live from Google.",
          noPlace:
            "This branch has no verified Google Place ID yet. Verify it before choosing photos.",
          noKey:
            "Google photos are unavailable. Enable Places API and add GOOGLE_PLACES_API_KEY on the server.",
          empty: "Places API returned no photos for this venue.",
          preview: "Approved public gallery",
          approve: "Approve for display",
          exclude: "Exclude",
          up: "Move earlier",
          down: "Move later",
          pending: "Unreviewed",
          approved: "Approved",
          excluded: "Excluded",
          choose: "Choose Focus relevance",
          error: "Could not save the photo decision. Try again.",
        };

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    void getBrowserSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (live) setToken(data.session?.access_token ?? "");
      });
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, []);

  const approvedChoices = candidate.venue_candidate_photo_choices
    .filter(
      (choice) =>
        choice.approved_for_display &&
        !choice.excluded &&
        !!choice.reviewed_at &&
        currentTime > 0 &&
        currentTime - Date.parse(choice.reviewed_at) < 86_400_000,
    )
    .sort((a, b) => a.display_order - b.display_order);
  const approvedPhotos = approvedChoices.flatMap(
    (choice) => photos.find((photo) => photo.position === choice.photo_position) ?? [],
  );

  async function decide(position: number, decision: "approved" | "excluded") {
    const choice = candidate.venue_candidate_photo_choices.find(
      (item) => item.photo_position === position,
    );
    const category = relevance[position] ?? choice?.relevance ?? "unreviewed";
    if (decision === "approved" && category === "unreviewed") {
      setError(copy.choose);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setFounderPhotoChoice(
        getBrowserSupabaseClient(),
        candidate.id,
        position,
        decision,
        choice?.display_order ?? approvedChoices.length,
        category,
      );
      await onUpdated();
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  async function move(position: number, direction: -1 | 1) {
    setBusy(true);
    setError("");
    try {
      await moveFounderPhotoChoice(getBrowserSupabaseClient(), candidate.id, position, direction);
      await onUpdated();
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold">{copy.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{copy.detail}</p>
      </div>
      {!candidate.google_place_id ? (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{copy.noPlace}</p>
      ) : null}
      {candidate.google_place_id && status === "unavailable" ? (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{copy.noKey}</p>
      ) : null}
      {candidate.google_place_id && status === "empty" ? (
        <p className="text-sm text-slate-500">{copy.empty}</p>
      ) : null}
      {approvedPhotos.length ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="mb-3 text-sm font-semibold text-emerald-900">
            {copy.preview} · {approvedPhotos.length}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {approvedPhotos.map((photo) => (
              <PlaceGallery
                key={photo.position}
                photos={[photo]}
                locale={locale}
                name={candidate.name_en}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo) => {
          const choice = candidate.venue_candidate_photo_choices.find(
            (item) => item.photo_position === photo.position,
          );
          return (
            <div
              key={photo.position}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <PlaceGallery photos={[photo]} locale={locale} name={candidate.name_en} />
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span>#{photo.position + 1}</span>
                  <strong>
                    {choice?.approved_for_display
                      ? copy.approved
                      : choice?.excluded
                        ? copy.excluded
                        : copy.pending}
                  </strong>
                </div>
                <select
                  aria-label={copy.choose}
                  className="find-input text-sm"
                  value={relevance[photo.position] ?? choice?.relevance ?? "unreviewed"}
                  onChange={(event) =>
                    setRelevance((current) => ({
                      ...current,
                      [photo.position]: event.target.value,
                    }))
                  }
                >
                  <option value="unreviewed">{copy.choose}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => void decide(photo.position, "approved")}
                    className="min-h-10 rounded-full bg-emerald-100 px-3 text-emerald-900"
                  >
                    {copy.approve}
                  </button>
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => void decide(photo.position, "excluded")}
                    className="min-h-10 rounded-full bg-slate-100 px-3"
                  >
                    {copy.exclude}
                  </button>
                  {choice?.approved_for_display ? (
                    <>
                      <button
                        disabled={busy}
                        type="button"
                        onClick={() => void move(photo.position, -1)}
                        className="min-h-10 rounded-full border px-3"
                      >
                        ↑ {copy.up}
                      </button>
                      <button
                        disabled={busy}
                        type="button"
                        onClick={() => void move(photo.position, 1)}
                        className="min-h-10 rounded-full border px-3"
                      >
                        ↓ {copy.down}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
