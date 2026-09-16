import type { Priority, SessionType } from "@/features/find/types";

import { calculateFocusScore } from "./focus-score";
import type { ActiveMatchFilters, MatchResult, VenueDimension, VenueEvidence } from "./types";

const sessionWeights: Record<
  Extract<SessionType, "deep-focus" | "group-study" | "remote-work" | "quick-study">,
  Partial<Record<VenueDimension, number>>
> = {
  "deep-focus": {
    quiet: 5,
    "deep-focus-suitability": 5,
    outlets: 4,
    comfort: 4,
    "table-suitability": 4,
    "long-stay": 4,
    wifi: 3,
    parking: 2,
  },
  "group-study": {
    "group-suitability": 5,
    "table-suitability": 4,
    comfort: 4,
    parking: 3,
    food: 3,
    quiet: 1,
  },
  "remote-work": {
    wifi: 5,
    outlets: 5,
    comfort: 4,
    "long-stay": 4,
    "call-friendly": 3,
    "remote-work-suitability": 5,
  },
  "quick-study": {
    "quick-session-suitability": 4,
    parking: 3,
    comfort: 2,
  },
};

const priorityToDimension: Record<Priority, VenueDimension> = {
  quiet: "quiet",
  outlets: "outlets",
  wifi: "wifi",
  comfort: "comfort",
  parking: "parking",
  budget: "budget",
  "long-stay": "long-stay",
  coffee: "coffee",
  food: "food",
  restrooms: "restrooms",
};

export function hasActiveMatchFilters(filters: ActiveMatchFilters) {
  return Boolean(
    filters.sessionType || filters.priorities.length || filters.locationChoice || filters.radius,
  );
}

export function calculateMatch(
  evidence: VenueEvidence,
  filters: ActiveMatchFilters,
): MatchResult | null {
  if (!hasActiveMatchFilters(filters) || evidence.reviewCount < 5) return null;

  const weights: Partial<Record<VenueDimension, number>> = {};
  if (
    filters.sessionType === "deep-focus" ||
    filters.sessionType === "group-study" ||
    filters.sessionType === "remote-work" ||
    filters.sessionType === "quick-study"
  ) {
    Object.assign(weights, sessionWeights[filters.sessionType]);
  }

  for (const priority of filters.priorities) {
    const dimension = priorityToDimension[priority];
    weights[dimension] = (weights[dimension] ?? 0) + 5;
  }

  let weightedTotal = 0;
  let availableWeight = 0;
  let availableDimensions = 0;
  for (const [dimension, weight] of Object.entries(weights) as Array<[VenueDimension, number]>) {
    const value = evidence.dimensions[dimension];
    if (typeof value !== "number") continue;
    weightedTotal += value * weight;
    availableWeight += weight;
    availableDimensions += 1;
  }

  if (availableWeight === 0 || availableDimensions < 2) return null;

  let normalized = weightedTotal / availableWeight / 10;
  const focusScore = calculateFocusScore(evidence);
  if (focusScore.status === "scored") {
    normalized = normalized * 0.85 + (focusScore.score / 10) * 0.15;
  }
  if (filters.locationChoice && evidence.locationChoice) {
    normalized =
      normalized * 0.85 + (filters.locationChoice === evidence.locationChoice ? 0.15 : 0);
  }

  const radius = filters.radius === "reasonable" ? undefined : Number(filters.radius);
  if (radius && typeof evidence.distanceMinutes === "number") {
    normalized = normalized * 0.9 + (evidence.distanceMinutes <= radius ? 0.1 : 0);
  }

  const matchedDimensions = (Object.keys(weights) as VenueDimension[])
    .filter((dimension) => (evidence.dimensions[dimension] ?? 0) >= 7)
    .sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0))
    .slice(0, 3);

  return {
    percent: Math.max(0, Math.min(100, Math.round(normalized * 100))),
    matchedDimensions,
  };
}
