import { calculateFocusScore } from "./focus-score";
import { calculateMatch, hasActiveMatchFilters } from "./matching";
import type { ActiveMatchFilters, VenueEvidence } from "./types";

export function rankVenues<T extends { evidence?: VenueEvidence }>(
  venues: T[],
  filters: ActiveMatchFilters,
) {
  const filtered = hasActiveMatchFilters(filters);

  return [...venues].sort((left, right) => {
    if (filtered && left.evidence && right.evidence) {
      const leftMatch = calculateMatch(left.evidence, filters)?.percent ?? -1;
      const rightMatch = calculateMatch(right.evidence, filters)?.percent ?? -1;
      if (leftMatch !== rightMatch) return rightMatch - leftMatch;
    }

    const leftScore = left.evidence ? calculateFocusScore(left.evidence) : null;
    const rightScore = right.evidence ? calculateFocusScore(right.evidence) : null;
    const leftRank = leftScore?.status === "scored" ? leftScore.score * leftScore.confidence : -1;
    const rightRank =
      rightScore?.status === "scored" ? rightScore.score * rightScore.confidence : -1;
    return rightRank - leftRank;
  });
}
