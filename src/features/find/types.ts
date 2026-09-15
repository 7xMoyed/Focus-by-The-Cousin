export type City = "riyadh" | "majmaah";

export type SessionType =
  "deep-focus" | "group-study" | "remote-work" | "light-study" | "online-class" | "quick-study";

export type VisitTime = "now" | "morning" | "afternoon" | "evening" | "late-night";

export type Priority =
  | "quiet"
  | "outlets"
  | "wifi"
  | "comfort"
  | "parking"
  | "budget"
  | "long-stay"
  | "coffee"
  | "food"
  | "restrooms";

export type LocationChoice = "near-me" | "university" | "north-riyadh" | "area";
export type RadiusChoice = "5" | "10" | "20" | "reasonable";

export type DiscoveryAnswers = {
  city?: City;
  sessionType?: SessionType;
  visitTime?: VisitTime;
  priorities: Priority[];
  locationChoice?: LocationChoice;
  radius?: RadiusChoice;
  manualArea?: string;
  contextualAnswer?: string;
};

export type StoredDiscoveryState = {
  answers: DiscoveryAnswers;
  step: number;
  stage: "intro" | "questions" | "teaser" | "signup";
};

export type VenueTeaser = {
  branchId: string;
  venueNameAr: string;
  venueNameEn: string;
  branchNameAr: string;
  branchNameEn: string;
};

export const DISCOVERY_STORAGE_KEY = "focus-discovery-v1";

export function emptyDiscoveryAnswers(): DiscoveryAnswers {
  return { priorities: [] };
}

export function isDiscoveryComplete(answers: DiscoveryAnswers) {
  return Boolean(
    answers.city &&
    answers.sessionType &&
    answers.visitTime &&
    answers.priorities.length > 0 &&
    answers.locationChoice &&
    answers.radius &&
    answers.contextualAnswer,
  );
}
