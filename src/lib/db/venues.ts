import { createClient } from "@/lib/supabase/server";
import type { BranchWithVenue } from "@/types/database";

/** Fetch all published branches for a city — server-side only */
export async function getPublishedBranchesByCity(
  cityId: string
): Promise<BranchWithVenue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venue_branches")
    .select(
      `
      *,
      venue:venues(*),
      city:cities(*),
      opening_hours(*)
      `
    )
    .eq("city_id", cityId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getPublishedBranchesByCity: ${error.message}`);
  return (data ?? []) as BranchWithVenue[];
}

export async function getBranchBySlug(
  slug: string
): Promise<BranchWithVenue | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venue_branches")
    .select(
      `
      *,
      venue:venues(*),
      city:cities(*),
      opening_hours(*)
      `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getBranchBySlug: ${error.message}`);
  return data as BranchWithVenue;
}
