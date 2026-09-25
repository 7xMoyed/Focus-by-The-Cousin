import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { isValidFounderSession } from "@/lib/founder-session";

const relevanceValues = new Set([
  "unreviewed",
  "interior",
  "tables",
  "seating",
  "laptop",
  "outlets",
  "atmosphere",
  "outdoor",
  "exterior",
  "parking",
]);

type PhotoChoiceRow = {
  candidate_id: string;
  photo_position: number;
  approved_for_display: boolean;
  excluded: boolean;
  display_order: number;
  relevance: string;
  founder_note: string | null;
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function validPosition(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 9;
}

export async function POST(request: NextRequest) {
  if (!isValidFounderSession(request.cookies.get("founder_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const candidateId = body.candidateId;
  const position = body.position;
  if (!validUuid(candidateId) || !validPosition(position)) {
    return NextResponse.json({ error: "invalid_photo_choice" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("venue_candidates")
    .select("google_place_id")
    .eq("id", candidateId)
    .maybeSingle<{ google_place_id: string | null }>();
  if (candidateError || !candidate) {
    return NextResponse.json({ error: "candidate_not_found" }, { status: 404 });
  }
  if (!candidate.google_place_id) {
    return NextResponse.json({ error: "candidate_place_id_required" }, { status: 409 });
  }

  if (body.action === "set") {
    const decision = body.decision;
    const relevance = body.relevance;
    const order = body.order;
    if (
      (decision !== "approved" && decision !== "excluded") ||
      typeof relevance !== "string" ||
      !relevanceValues.has(relevance) ||
      !Number.isInteger(order) ||
      Number(order) < 0 ||
      Number(order) > 9
    ) {
      return NextResponse.json({ error: "invalid_photo_choice" }, { status: 400 });
    }

    const { error } = await supabase.from("venue_candidate_photo_choices").upsert(
      {
        candidate_id: candidateId,
        photo_position: position,
        approved_for_display: decision === "approved",
        excluded: decision === "excluded",
        display_order: order,
        relevance,
        founder_note: null,
        reviewed_by: null,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: "candidate_id,photo_position" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "move" && (body.direction === -1 || body.direction === 1)) {
    const { data, error } = await supabase
      .from("venue_candidate_photo_choices")
      .select(
        "candidate_id,photo_position,approved_for_display,excluded,display_order,relevance,founder_note",
      )
      .eq("candidate_id", candidateId)
      .eq("approved_for_display", true)
      .eq("excluded", false)
      .order("display_order")
      .returns<PhotoChoiceRow[]>();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const choices = data ?? [];
    const currentIndex = choices.findIndex((choice) => choice.photo_position === position);
    const otherIndex = currentIndex + body.direction;
    if (currentIndex < 0 || otherIndex < 0 || otherIndex >= choices.length) {
      return NextResponse.json({ ok: true });
    }

    const current = choices[currentIndex];
    const other = choices[otherIndex];
    const reviewedAt = new Date().toISOString();
    const { error: moveError } = await supabase.from("venue_candidate_photo_choices").upsert(
      [
        {
          ...current,
          display_order: other.display_order,
          reviewed_by: null,
          reviewed_at: reviewedAt,
        },
        {
          ...other,
          display_order: current.display_order,
          reviewed_by: null,
          reviewed_at: reviewedAt,
        },
      ],
      { onConflict: "candidate_id,photo_position" },
    );
    if (moveError) return NextResponse.json({ error: moveError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_photo_action" }, { status: 400 });
}
