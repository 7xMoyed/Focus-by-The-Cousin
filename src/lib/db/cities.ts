import { createClient } from "@/lib/supabase/server";
import type { City } from "@/types/database";

/** Fetch all cities — server-side only */
export async function getCities(): Promise<City[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .order("name_ar");

  if (error) throw new Error(`getCities: ${error.message}`);
  return data ?? [];
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error?.code === "PGRST116") return null; // Not found
  if (error) throw new Error(`getCityBySlug: ${error.message}`);
  return data;
}
