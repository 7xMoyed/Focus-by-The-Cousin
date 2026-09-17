import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { VenueCandidate } from "@/features/venue-research/types";

const candidateSelect = `
  id,research_key,status,name_ar,name_en,branch_name_ar,branch_name_en,
  city_code,neighborhood_ar,neighborhood_en,address_ar,address_en,
  latitude,longitude,google_maps_url,official_website_url,official_instagram_url,
  official_contact_channels,focus_eligibility,confidence,why_it_may_fit,
  possible_concerns,duplicate_status,duplicate_notes,approved_for_publication,
  moderation_reason,reviewed_at,researched_at,
  venue_candidate_sources(id,source_type,source_title,source_url,checked_at,information_summary,attribution_text),
  venue_candidate_evidence(id,category,evidence_level,score_awarded,max_score,summary),
  venue_candidate_images(id,source_type,source_url,external_preview_url,attribution_text,inspection_summary,sort_order)
`;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("founder_auth")?.value === "1";
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("venue_candidates")
    .select(candidateSelect)
    .order("updated_at", { ascending: false })
    .returns<VenueCandidate[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = (data ?? []).map((c) => ({
    ...c,
    venue_candidate_sources: c.venue_candidate_sources ?? [],
    venue_candidate_evidence: c.venue_candidate_evidence ?? [],
    venue_candidate_images: (c.venue_candidate_images ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));

  return NextResponse.json(candidates);
}
