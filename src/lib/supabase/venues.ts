import { createSupabaseClient } from "./client";

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

  return data ?? [];
}
