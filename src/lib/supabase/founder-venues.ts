import type { SupabaseClient } from "@supabase/supabase-js";

import type { CandidateStatus, VenueCandidate } from "@/features/venue-research/types";

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

export async function loadFounderCandidates(client: SupabaseClient) {
  const { data, error } = await client
    .from("venue_candidates")
    .select(candidateSelect)
    .order("updated_at", { ascending: false })
    .returns<VenueCandidate[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map((candidate) => ({
    ...candidate,
    venue_candidate_sources: candidate.venue_candidate_sources ?? [],
    venue_candidate_evidence: candidate.venue_candidate_evidence ?? [],
    venue_candidate_images: (candidate.venue_candidate_images ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));
}

export async function moderateFounderCandidate(
  client: SupabaseClient,
  candidateId: string,
  decision: Extract<CandidateStatus, "approved" | "rejected" | "needs_review">,
  reason?: string,
  note?: string,
) {
  const { error } = await client.rpc("moderate_venue_candidate", {
    candidate_id: candidateId,
    decision,
    reason: reason || null,
    note: note || null,
  });

  if (error) throw new Error(error.message);
}
