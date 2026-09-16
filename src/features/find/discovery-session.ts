import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  City,
  DiscoveryAnswers,
  LocationChoice,
  Priority,
  RadiusChoice,
  SessionType,
  StoredDiscoveryState,
  VisitTime,
} from "@/features/find/types";
import { DISCOVERY_STORAGE_KEY } from "@/features/find/types";

const cities = new Set<City>(["riyadh", "majmaah"]);
const sessionTypes = new Set<SessionType>([
  "deep-focus",
  "group-study",
  "remote-work",
  "light-study",
  "online-class",
  "quick-study",
]);
const visitTimes = new Set<VisitTime>(["now", "morning", "afternoon", "evening", "late-night"]);
const priorities = new Set<Priority>([
  "quiet",
  "outlets",
  "wifi",
  "comfort",
  "parking",
  "budget",
  "long-stay",
  "coffee",
  "food",
  "restrooms",
]);
const locationChoices = new Set<LocationChoice>([
  "near-me",
  "university",
  "north-riyadh",
  "east-riyadh",
  "central-riyadh",
  "west-riyadh",
  "south-riyadh",
  "area",
]);
const radii = new Set<RadiusChoice>(["5", "10", "20", "reasonable"]);

export function createDiscoverySessionId() {
  return crypto.randomUUID();
}

export function isValidDiscoveryAnswers(value: unknown): value is DiscoveryAnswers {
  if (!value || typeof value !== "object") return false;
  const answers = value as DiscoveryAnswers;
  if (!Array.isArray(answers.priorities)) return false;
  const uniquePriorities = new Set(answers.priorities);

  return Boolean(
    answers.city &&
    cities.has(answers.city) &&
    answers.sessionType &&
    sessionTypes.has(answers.sessionType) &&
    answers.visitTime &&
    visitTimes.has(answers.visitTime) &&
    answers.priorities.length >= 1 &&
    answers.priorities.length <= 3 &&
    uniquePriorities.size === answers.priorities.length &&
    answers.priorities.every((priority) => priorities.has(priority)) &&
    answers.locationChoice &&
    locationChoices.has(answers.locationChoice) &&
    answers.radius &&
    radii.has(answers.radius) &&
    typeof answers.contextualAnswer === "string" &&
    answers.contextualAnswer.length > 0 &&
    answers.contextualAnswer.length <= 100 &&
    (answers.locationChoice !== "area" ||
      (typeof answers.manualArea === "string" &&
        answers.manualArea.trim().length > 0 &&
        answers.manualArea.trim().length <= 120)),
  );
}

export function readStoredDiscoveryState() {
  try {
    const raw = window.localStorage.getItem(DISCOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDiscoveryState;
    if (!parsed.answers || !Array.isArray(parsed.answers.priorities)) return null;
    return parsed;
  } catch {
    window.localStorage.removeItem(DISCOVERY_STORAGE_KEY);
    return null;
  }
}

export async function saveDiscoverySession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  answers: DiscoveryAnswers,
  locale: "ar" | "en",
) {
  if (!isValidDiscoveryAnswers(answers)) throw new Error("Invalid discovery answers.");

  const { error } = await supabase.from("discovery_sessions").upsert(
    {
      user_id: userId,
      client_session_id: sessionId,
      answers,
      preferred_language: locale,
    },
    { onConflict: "user_id,client_session_id" },
  );

  if (error) throw error;
}
