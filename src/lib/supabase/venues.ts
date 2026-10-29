import { createSupabaseClient } from "./client";
import type { QueryData } from "@supabase/supabase-js";
import type { VenueDimension, VenueEvidence } from "@/lib/recommendations/types";
import type { PublicVenueEnrichment } from "@/features/venues/place-photo";

const publishedBranchPageSize = 200;
const reviewPageSize = 500;
const reviewBranchChunkSize = 50;
const enrichmentConcurrency = 8;
const publishedBranchSelect =
  "id,slug,name_ar,name_en,address_ar,google_maps_url,latitude,longitude,average_spend_min,average_spend_max,venues!inner(name_ar,name_en,venue_type),cities!inner(name_ar,name_en,slug),opening_hours(day_of_week,opens_at,closes_at,is_closed)" as const;

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
  id: string;
  branch_id: string;
  created_at: string;
  review_scores: ReviewScoreRow | ReviewScoreRow[] | null;
};

function buildPublishedBranchesQuery(
  client: ReturnType<typeof createSupabaseClient>,
  cityCode?: string,
) {
  let query = client
    .from("venue_branches")
    .select(publishedBranchSelect)
    .eq("is_published", true)
    .order("name_en")
    .order("id");

  if (cityCode) {
    query = query.eq("cities.slug", cityCode);
  }

  return query;
}

type PublishedBranchRow = QueryData<ReturnType<typeof buildPublishedBranchesQuery>>[number];

export async function getPublishedBranches(cityCode?: string) {
  const client = createSupabaseClient();
  const branches = await loadPublishedBranchRows(client, cityCode);
  if (!branches.length) {
    return branches.map((branch) => ({
      ...branch,
      evidence: emptyEvidence(),
      enrichment: null as PublicVenueEnrichment | null,
    }));
  }

  const enrichmentByBranch = new Map<string, PublicVenueEnrichment>();
  for (let start = 0; start < branches.length; start += enrichmentConcurrency) {
    await Promise.all(
      branches.slice(start, start + enrichmentConcurrency).map(async (branch) => {
        const { data } = await client.rpc("get_public_venue_enrichment", {
          target_branch_id: branch.id,
        });
        if (data) enrichmentByBranch.set(branch.id, data as PublicVenueEnrichment);
      }),
    );
  }

  const reviewResult = await loadApprovedReviews(
    client,
    branches.map((branch) => branch.id),
  );

  if (reviewResult.failed) {
    return branches.map((branch) => ({
      ...branch,
      evidence: emptyEvidence(),
      enrichment: enrichmentByBranch.get(branch.id) ?? null,
    }));
  }

  const evidenceByBranch = aggregateReviewEvidence(reviewResult.rows);
  return branches.map((branch) => ({
    ...branch,
    evidence: evidenceByBranch.get(branch.id) ?? emptyEvidence(),
    enrichment: enrichmentByBranch.get(branch.id) ?? null,
  }));
}

async function loadPublishedBranchRows(
  client: ReturnType<typeof createSupabaseClient>,
  cityCode?: string,
) {
  const branches = new Map<string, PublishedBranchRow>();

  for (let offset = 0; ; offset += publishedBranchPageSize) {
    const { data, error } = await buildPublishedBranchesQuery(client, cityCode).range(
      offset,
      offset + publishedBranchPageSize - 1,
    );

    if (error) {
      throw new Error(`Unable to load published branches: ${error.code}`);
    }

    const page = data ?? [];
    for (const branch of page) branches.set(branch.id, branch);
    if (page.length < publishedBranchPageSize) return [...branches.values()];
  }
}

async function loadApprovedReviews(
  client: ReturnType<typeof createSupabaseClient>,
  branchIds: string[],
) {
  const rows: ApprovedReviewRow[] = [];

  for (let branchStart = 0; branchStart < branchIds.length; branchStart += reviewBranchChunkSize) {
    const branchChunk = branchIds.slice(branchStart, branchStart + reviewBranchChunkSize);

    for (let offset = 0; ; offset += reviewPageSize) {
      const { data, error } = await client
        .from("reviews")
        .select(
          "id,branch_id,created_at,review_scores(quietness,seating,power_outlets,wifi_quality,table_suitability,restroom,parking,laptop_friendliness,long_session,solo_study,group_study,remote_work)",
        )
        .in("branch_id", branchChunk)
        .eq("is_approved", true)
        .order("created_at")
        .order("branch_id")
        .order("id")
        .range(offset, offset + reviewPageSize - 1)
        .returns<ApprovedReviewRow[]>();

      if (error) return { rows: [] as ApprovedReviewRow[], failed: true as const };

      const page = data ?? [];
      rows.push(...page);
      if (page.length < reviewPageSize) break;
    }
  }

  return { rows, failed: false as const };
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
