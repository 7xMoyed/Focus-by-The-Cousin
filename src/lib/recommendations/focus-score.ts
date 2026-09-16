import type { FocusScoreResult, VenueDimension, VenueEvidence } from "./types";

const overallDimensions: VenueDimension[] = [
  "quiet",
  "wifi",
  "outlets",
  "comfort",
  "parking",
  "long-stay",
  "budget",
  "coffee",
  "restrooms",
  "laptop-friendly",
  "table-suitability",
  "deep-focus-suitability",
  "group-suitability",
  "remote-work-suitability",
];

const minimumReviews = 5;
const minimumDimensions = 4;

export function calculateFocusScore(evidence: VenueEvidence): FocusScoreResult {
  const values = overallDimensions
    .map((dimension) => evidence.dimensions[dimension])
    .filter((value): value is number => typeof value === "number" && value >= 0 && value <= 10);

  if (evidence.reviewCount < minimumReviews || values.length < minimumDimensions) {
    return { status: "insufficient-data", reviewCount: evidence.reviewCount };
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const confidence = Math.min(1, evidence.reviewCount / 20);

  return {
    status: "scored",
    score: Math.round(average * 10) / 10,
    confidence,
    reviewCount: evidence.reviewCount,
  };
}
