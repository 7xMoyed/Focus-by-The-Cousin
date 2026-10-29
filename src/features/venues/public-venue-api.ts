import type { DisplayBranch } from "@/features/venues/rich-venue-card";

const publicVenuePageSize = 50;
const maxPublicVenuePages = 100;

type PublicVenuePage = {
  branches?: DisplayBranch[];
  hasMore?: boolean;
};

export async function fetchAllPublishedVenuePages({
  city,
  signal,
}: {
  city?: string;
  signal?: AbortSignal;
} = {}) {
  const branches = new Map<string, DisplayBranch>();

  for (let page = 1; page <= maxPublicVenuePages; page += 1) {
    const params = new URLSearchParams({
      limit: String(publicVenuePageSize),
      page: String(page),
    });
    if (city) params.set("city", city);

    const response = await fetch(`/api/venues?${params.toString()}`, { signal });
    if (!response.ok) throw new Error("Unable to load published venues.");

    const payload = (await response.json()) as PublicVenuePage;
    const pageBranches = payload.branches ?? [];
    for (const branch of pageBranches) branches.set(branch.id, branch);

    if (!payload.hasMore) return [...branches.values()];
    if (!pageBranches.length) throw new Error("Venue pagination returned an empty page.");
  }

  throw new Error("Venue pagination exceeded the supported page range.");
}
