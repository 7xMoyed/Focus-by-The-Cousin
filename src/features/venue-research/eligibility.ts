import type { EvidenceCategory, VenueCandidateEvidence } from "./types";

export const eligibilityWeights: Record<EvidenceCategory, number> = {
  seating: 25,
  study_laptop: 20,
  quietness: 15,
  wifi: 10,
  outlets: 10,
  parking_access: 10,
  long_stay: 5,
  environment: 5,
};

export function calculateFocusEligibility(evidence: VenueCandidateEvidence[]) {
  const byCategory = new Map(evidence.map((item) => [item.category, item]));

  return (Object.entries(eligibilityWeights) as Array<[EvidenceCategory, number]>).reduce(
    (total, [category, maxScore]) => {
      const item = byCategory.get(category);
      if (!item || item.max_score !== maxScore) return total;
      return total + Math.min(Math.max(item.score_awarded, 0), maxScore);
    },
    0,
  );
}

export function eligibilityBand(score: number) {
  if (score >= 80) return "strong" as const;
  if (score >= 65) return "judgment" as const;
  return "weak" as const;
}
