import type { LocationChoice, Priority, SessionType } from "@/features/find/types";

export type VenueDimension =
  | Priority
  | "laptop-friendly"
  | "table-suitability"
  | "deep-focus-suitability"
  | "group-suitability"
  | "remote-work-suitability"
  | "quick-session-suitability"
  | "call-friendly";

export type VenueEvidence = {
  dimensions: Partial<Record<VenueDimension, number>>;
  reviewCount: number;
  lastReviewedAt?: string;
  locationChoice?: LocationChoice;
  distanceMinutes?: number;
  isOpen?: boolean;
  openingHoursReliable?: boolean;
};

export type ActiveMatchFilters = {
  sessionType?: SessionType;
  priorities: Priority[];
  locationChoice?: LocationChoice;
  radius?: "5" | "10" | "20" | "reasonable";
};

export type FocusScoreResult =
  | { status: "insufficient-data"; reviewCount: number }
  | { status: "scored"; score: number; confidence: number; reviewCount: number };

export type MatchResult = {
  percent: number;
  matchedDimensions: VenueDimension[];
};
