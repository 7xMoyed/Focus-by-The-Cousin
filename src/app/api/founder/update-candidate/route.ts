import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { facilityKeys, type FacilityState } from "@/features/venues/facility-definitions";
import { isValidFounderSession } from "@/lib/founder-session";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// Only allow editing safe fields — no status, no id
const EDITABLE_FIELDS = [
  "focus_eligibility",
  "confidence",
  "why_it_may_fit",
  "possible_concerns",
  "duplicate_notes",
  "name_ar",
  "name_en",
  "branch_name_ar",
  "branch_name_en",
  "address_ar",
  "address_en",
  "google_maps_url",
  "official_instagram_url",
  "official_website_url",
] as const;

export async function PATCH(request: NextRequest) {
  if (!isValidFounderSession(request.cookies.get("founder_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidateId, updates, cardFields } = await request.json();
  if (!candidateId || (!updates && !cardFields)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Filter to only editable fields
  const safe = Object.fromEntries(
    Object.entries(updates ?? {}).filter(([k]) =>
      EDITABLE_FIELDS.includes(k as (typeof EDITABLE_FIELDS)[number]),
    ),
  );

  if (!Object.keys(safe).length && !cardFields) {
    return NextResponse.json({ error: "no_valid_fields" }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (Object.keys(safe).length) {
    const { error } = await supabase
      .from("venue_candidates")
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq("id", candidateId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (cardFields) {
    const rating = cardFields.preliminaryRating;
    const ratingApproved = cardFields.preliminaryRatingApproved === true;
    if (rating !== null && (typeof rating !== "number" || rating < 1 || rating > 10)) {
      return NextResponse.json({ error: "invalid_preliminary_rating" }, { status: 400 });
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("venue_candidates")
      .select("status,approved_for_publication,confidence")
      .eq("id", candidateId)
      .single<{
        status: string;
        approved_for_publication: boolean;
        confidence: string;
      }>();
    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: candidateError?.message ?? "candidate_not_found" },
        { status: 404 },
      );
    }
    if (
      ratingApproved &&
      (!rating ||
        candidate.status !== "approved" ||
        !candidate.approved_for_publication ||
        candidate.confidence === "low")
    ) {
      return NextResponse.json({ error: "preliminary_rating_not_publishable" }, { status: 400 });
    }

    const facilities = Array.isArray(cardFields.facilities) ? cardFields.facilities : [];
    const validStates = new Set<FacilityState>(["yes", "no", "unknown"]);
    let rows: Array<Record<string, unknown>>;
    try {
      rows = facilities.map((facility: Record<string, unknown>) => {
        if (
          typeof facility.key !== "string" ||
          !facilityKeys.includes(facility.key as (typeof facilityKeys)[number]) ||
          typeof facility.proposedState !== "string" ||
          !validStates.has(facility.proposedState as FacilityState) ||
          typeof facility.confirmedState !== "string" ||
          !validStates.has(facility.confirmedState as FacilityState)
        ) {
          throw new Error("invalid_facility_update");
        }
        const evidence = typeof facility.evidence === "string" ? facility.evidence.trim() : "";
        const sourceUrl = typeof facility.sourceUrl === "string" ? facility.sourceUrl.trim() : "";
        if (
          evidence.length > 2000 ||
          sourceUrl.length > 1000 ||
          (sourceUrl && !/^(https?:\/\/|\/)/.test(sourceUrl))
        ) {
          throw new Error("invalid_facility_evidence");
        }
        const timestamp = new Date().toISOString();
        return {
          candidate_id: candidateId,
          facility_key: facility.key,
          proposed_state: facility.proposedState,
          confirmed_state: facility.confirmedState,
          evidence_summary: evidence,
          source_url: sourceUrl || null,
          confirmed_at: timestamp,
          confirmed_by: null,
          updated_at: timestamp,
        };
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "invalid_facility_update" },
        { status: 400 },
      );
    }

    if (rows.length) {
      const { error: facilityError } = await supabase
        .from("venue_candidate_facilities")
        .upsert(rows, { onConflict: "candidate_id,facility_key" });
      if (facilityError) {
        return NextResponse.json({ error: facilityError.message }, { status: 500 });
      }
    }

    const { error: ratingError } = await supabase
      .from("venue_candidates")
      .update({
        public_preliminary_rating: rating,
        public_preliminary_rating_approved: ratingApproved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);
    if (ratingError) return NextResponse.json({ error: ratingError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
