export type CandidateStatus =
  "pending" | "approved" | "rejected" | "needs_review" | "duplicate_candidate";

export type EvidenceLevel = "verified" | "strong" | "some" | "unknown" | "negative";

export type EvidenceCategory =
  | "seating"
  | "study_laptop"
  | "quietness"
  | "wifi"
  | "outlets"
  | "parking_access"
  | "long_stay"
  | "environment";

export type VenueCandidateSource = {
  id: string;
  source_type: string;
  source_title: string;
  source_url: string;
  checked_at: string;
  information_summary: string;
  attribution_text: string | null;
};

export type VenueCandidateEvidence = {
  id: string;
  category: EvidenceCategory;
  evidence_level: EvidenceLevel;
  score_awarded: number;
  max_score: number;
  summary: string;
};

export type VenueCandidateImage = {
  id: string;
  source_type: string;
  source_url: string;
  external_preview_url: string | null;
  attribution_text: string | null;
  inspection_summary: string;
  sort_order: number;
};

export type VenueCandidatePhotoChoice = {
  id: string;
  photo_position: number;
  approved_for_display: boolean;
  excluded: boolean;
  display_order: number;
  relevance: string;
  founder_note: string | null;
  reviewed_at: string | null;
};

export type VenueCandidate = {
  id: string;
  research_key: string;
  venue_type: "cafe" | "library" | "coworking";
  status: CandidateStatus;
  name_ar: string;
  name_en: string;
  branch_name_ar: string | null;
  branch_name_en: string | null;
  city_code: "riyadh" | "majmaah";
  neighborhood_ar: string | null;
  neighborhood_en: string | null;
  address_ar: string | null;
  address_en: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  google_place_id: string | null;
  official_website_url: string | null;
  official_instagram_url: string | null;
  official_contact_channels: Record<string, string>;
  focus_eligibility: number;
  confidence: "high" | "medium" | "low";
  why_it_may_fit: string;
  possible_concerns: string;
  duplicate_status: "no_visible_match" | "possible_match" | "confirmed_duplicate" | "not_checked";
  duplicate_notes: string | null;
  approved_for_publication: boolean;
  moderation_reason: string | null;
  reviewed_at: string | null;
  researched_at: string;
  venue_candidate_sources: VenueCandidateSource[];
  venue_candidate_evidence: VenueCandidateEvidence[];
  venue_candidate_images: VenueCandidateImage[];
  venue_candidate_photo_choices: VenueCandidatePhotoChoice[];
};
