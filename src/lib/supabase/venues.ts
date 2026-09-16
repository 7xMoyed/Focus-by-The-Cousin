import { createSupabaseClient } from "./client";
import type { VenueDimension, VenueEvidence } from "@/lib/recommendations/types";

type ReviewScoreRow = {
  quietness: number | null;
  seating: number | null;
  power_outlets: number | null;
  wifi_quality: number | null;
  table_suitability: number | null;
  restroom: number | null;
  parking: number | null;
  laptop_friendliness: number | null;
  long_session: number | null;
  solo_study: number | null;
  group_study: number | null;
  remote_work: number | null;
};

type ApprovedReviewRow = {
  branch_id: string;
  created_at: string;
  review_scores: ReviewScoreRow | ReviewScoreRow[] | null;
};

export async function getPublishedBranches(cityCode?: string) {
  const client = createSupabaseClient();

  let query = client
    .from("venue_branches")
    .select(
      "id,slug,name_ar,name_en,address_ar,google_maps_url,average_spend_min,average_spend_max,venues!inner(name_ar,name_en,venue_type),cities!inner(name_ar,name_en,slug),opening_hours(day_of_week,opens_at,closes_at,is_closed)",
    )
    .eq("is_published", true)
    .order("name_en")
    .limit(50);

  if (cityCode) {
    query = query.eq("cities.slug", cityCode);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load published branches: ${error.code}`);
  }

  const branches = data ?? [];
  if (!branches.length) return branches;

  const { data: reviews, error: reviewsError } = await client
    .from("reviews")
    .select(
      "branch_id,created_at,review_scores(quietness,seating,power_outlets,wifi_quality,table_suitability,restroom,parking,laptop_friendliness,long_session,solo_study,group_study,remote_work)",
    )
    .in(
      "branch_id",
      branches.map((branch) => branch.id),
    )
    .eq("is_approved", true)
    .returns<ApprovedReviewRow[]>();

  if (reviewsError) {
    return branches.map((branch) => ({ ...branch, evidence: emptyEvidence() }));
  }

  const evidenceByBranch = aggregateReviewEvidence(reviews ?? []);
  return branches.map((branch) => ({
    ...branch,
    evidence: evidenceByBranch.get(branch.id) ?? emptyEvidence(),
  }));
}

const scoreColumns: Array<[keyof ReviewScoreRow, VenueDimension]> = [
  ["quietness", "quiet"],
  ["seating", "comfort"],
  ["power_outlets", "outlets"],
  ["wifi_quality", "wifi"],
  ["table_suitability", "table-suitability"],
  ["restroom", "restrooms"],
  ["parking", "parking"],
  ["laptop_friendliness", "laptop-friendly"],
  ["long_session", "long-stay"],
  ["solo_study", "deep-focus-suitability"],
  ["group_study", "group-suitability"],
  ["remote_work", "remote-work-suitability"],
];

function aggregateReviewEvidence(rows: ApprovedReviewRow[]) {
  const grouped = new Map<string, ApprovedReviewRow[]>();
  for (const row of rows) {
    grouped.set(row.branch_id, [...(grouped.get(row.branch_id) ?? []), row]);
  }

  const result = new Map<string, VenueEvidence>();
  for (const [branchId, branchReviews] of grouped) {
    const scores = branchReviews.flatMap((review) => {
      if (!review.review_scores) return [];
      return Array.isArray(review.review_scores) ? review.review_scores : [review.review_scores];
    });
    const dimensions: VenueEvidence["dimensions"] = {};

    for (const [column, dimension] of scoreColumns) {
      const values = scores
        .map((score) => score[column])
        .filter((value): value is number => typeof value === "number");
      if (values.length) {
        const averageOutOfFive = values.reduce((sum, value) => sum + value, 0) / values.length;
        dimensions[dimension] = Math.round(averageOutOfFive * 20) / 10;
      }
    }

    result.set(branchId, {
      dimensions,
      reviewCount: branchReviews.length,
      lastReviewedAt: branchReviews
        .map((review) => review.created_at)
        .sort()
        .at(-1),
    });
  }
  return result;
}

function emptyEvidence(): VenueEvidence {
  return { dimensions: {}, reviewCount: 0 };
}
