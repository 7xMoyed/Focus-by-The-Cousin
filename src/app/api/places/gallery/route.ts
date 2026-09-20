import { createClient } from "@supabase/supabase-js";

import type { PublicVenueEnrichment } from "@/features/venues/place-photo";
import { getPlacePhotos } from "@/lib/google/places-photos";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const candidateId = url.searchParams.get("candidate");
  const branchId = url.searchParams.get("branch");
  if (!!candidateId === !!branchId) {
    return Response.json({ error: "Choose one venue." }, { status: 400 });
  }
  const supabase = createSupabaseClient();
  let placeId: string | null = null;
  let positions: number[] | undefined;

  if (candidateId) {
    const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
    if (!token || !/^[0-9a-f-]{36}$/i.test(candidateId)) {
      return Response.json({ error: "Not authorized." }, { status: 401 });
    }
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: user, error: userError } = await client.auth.getUser(token);
    if (userError || !user.user) {
      return Response.json({ error: "Not authorized." }, { status: 401 });
    }
    const { data, error } = await client
      .from("venue_candidates")
      .select("google_place_id")
      .eq("id", candidateId)
      .maybeSingle<{ google_place_id: string | null }>();
    if (error || !data) return Response.json({ error: "Not found." }, { status: 404 });
    placeId = data.google_place_id;
  } else {
    if (!branchId || !/^[0-9a-f-]{36}$/i.test(branchId)) {
      return Response.json({ error: "Invalid venue." }, { status: 400 });
    }
    const { data } = await supabase.rpc("get_public_venue_enrichment", {
      target_branch_id: branchId,
    });
    const enrichment = data as PublicVenueEnrichment | null;
    placeId = enrichment?.googlePlaceId ?? null;
    positions = enrichment?.photoPositions ?? [];
  }

  if (!placeId || (positions && positions.length === 0)) {
    return Response.json(
      { status: "empty", photos: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const gallery = await getPlacePhotos(placeId, positions);
  return Response.json(gallery, { headers: { "Cache-Control": "no-store" } });
}
