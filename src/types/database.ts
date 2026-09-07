/**
 * Database types for Focus by The Cousin.
 *
 * These are manually maintained until Supabase CLI type generation is set up.
 * To regenerate automatically:
 *   npx supabase gen types typescript --project-id zyzpvwpnqeflbjsfvgwc > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Row Types ────────────────────────────────────────────────────────────────

export interface City {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  created_at: string;
}

export interface Venue {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  venue_type: VenueType;
  description_ar: string | null;
  logo_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueBranch {
  id: string;
  venue_id: string;
  city_id: string;
  name_ar: string | null;
  name_en: string | null;
  slug: string;
  address_ar: string | null;
  google_maps_url: string | null;
  /** PostGIS geography(Point,4326) — returned as GeoJSON string from PostgREST */
  location: string | null;
  phone: string | null;
  average_spend_min: number | null;
  average_spend_max: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpeningHour {
  id: string;
  branch_id: string;
  /** 0 = Sunday … 6 = Saturday */
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export interface Review {
  id: string;
  branch_id: string;
  user_id: string | null;
  visitor_name: string | null;
  visit_date: string | null;
  visit_time_slot: TimeSlot | null;
  visit_day_type: DayType | null;
  study_mode: StudyMode | null;
  crowd_level: CrowdLevel | null;
  duration_minutes: number | null;
  comment_ar: string | null;
  image_url: string | null;
  is_approved: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface ReviewScore {
  review_id: string;
  quietness: Rating | null;
  seating: Rating | null;
  power_outlets: Rating | null;
  wifi_quality: Rating | null;
  table_suitability: Rating | null;
  restroom: Rating | null;
  parking: Rating | null;
  laptop_friendliness: Rating | null;
  long_session: Rating | null;
  solo_study: Rating | null;
  group_study: Rating | null;
  remote_work: Rating | null;
}

// ─── Enums / Unions ────────────────────────────────────────────────────────────

export type VenueType = "cafe" | "library" | "coworking" | "restaurant";

export type TimeSlot = "morning" | "afternoon" | "evening" | "night";

export type DayType = "weekday" | "weekend";

export type StudyMode = "deep_focus" | "group_study" | "remote_work";

export type CrowdLevel = "empty" | "light" | "moderate" | "busy" | "packed";

/** 1–5 rating scale */
export type Rating = 1 | 2 | 3 | 4 | 5;

// ─── Composite / View types ────────────────────────────────────────────────────

/** Branch joined with its venue and city — used in listing/detail pages */
export interface BranchWithVenue extends VenueBranch {
  venue: Venue;
  city: City;
  opening_hours: OpeningHour[];
}

/** Aggregated focus score for a branch, calculated from approved review_scores */
export interface BranchFocusScore {
  branch_id: string;
  review_count: number;
  avg_quietness: number | null;
  avg_seating: number | null;
  avg_power_outlets: number | null;
  avg_wifi_quality: number | null;
  avg_table_suitability: number | null;
  avg_restroom: number | null;
  avg_parking: number | null;
  avg_laptop_friendliness: number | null;
  avg_long_session: number | null;
  avg_solo_study: number | null;
  avg_group_study: number | null;
  avg_remote_work: number | null;
  /** Overall weighted average across all dimensions */
  focus_score: number | null;
}
