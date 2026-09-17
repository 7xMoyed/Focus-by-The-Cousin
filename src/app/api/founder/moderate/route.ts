// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

function getServiceClient(): AnyClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("founder_auth")?.value === "1";
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function publishToVenueBranches(supabase: AnyClient, candidateId: string) {
  // Load the candidate
  const { data: c, error: cErr } = await supabase
    .from("venue_candidates")
    .select("*")
    .eq("id", candidateId)
    .single();
  if (cErr || !c) throw new Error("Candidate not found");

  // Get city id from city_code
  const { data: city, error: cityErr } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", c.city_code)
    .single();
  if (cityErr || !city) throw new Error(`City not found: ${c.city_code}`);

  // Upsert venue (by slug)
  const venueSlug = toSlug(c.name_en || c.name_ar);
  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .upsert(
      {
        name_ar: c.name_ar,
        name_en: c.name_en,
        slug: venueSlug,
        venue_type: "cafe",
        description_ar: c.why_it_may_fit ?? null,
        ...(c.official_instagram_url ? { instagram_handle: c.official_instagram_url.replace(/.*instagram\.com\//, "").replace(/\/$/, "") } : {}),
        ...(c.official_website_url ? { website_url: c.official_website_url } : {}),
      },
      { onConflict: "slug", ignoreDuplicates: false }
    )
    .select("id")
    .single();
  if (venueErr || !venue) throw new Error(`Venue upsert failed: ${venueErr?.message}`);

  // Upsert branch (by slug)
  const branchSlug = toSlug(`${c.name_en || c.name_ar}-${c.city_code}`);
  const locationSql = c.latitude && c.longitude
    ? `ST_MakePoint(${c.longitude}, ${c.latitude})::geography`
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branchData: any = {
    venue_id: venue.id,
    city_id: city.id,
    name_ar: c.branch_name_ar || c.name_ar,
    name_en: c.branch_name_en || c.name_en,
    slug: branchSlug,
    address_ar: c.address_ar,
    address_en: c.address_en,
    google_maps_url: c.google_maps_url,
    is_published: true,
  };

  // Insert branch (can't use upsert with ST_MakePoint easily — use raw query for location)
  const { data: existing } = await supabase
    .from("venue_branches")
    .select("id")
    .eq("slug", branchSlug)
    .single();

  if (existing) {
    // Update existing
    await supabase.from("venue_branches").update({ ...branchData, updated_at: new Date().toISOString() }).eq("slug", branchSlug);
  } else {
    // Insert new — set location via raw SQL if coordinates exist
    if (locationSql) {
      const { error: rawErr } = await supabase.rpc("exec_sql" as never, {
        sql: `INSERT INTO venue_branches (venue_id, city_id, name_ar, name_en, slug, address_ar, google_maps_url, location, is_published)
              VALUES ('${venue.id}', '${city.id}', '${(c.branch_name_ar || c.name_ar).replace(/'/g, "''")}', '${(c.branch_name_en || c.name_en).replace(/'/g, "''")}', '${branchSlug}', '${(c.address_ar || "").replace(/'/g, "''")}', ${c.google_maps_url ? `'${c.google_maps_url}'` : "NULL"}, ${locationSql}, true)
              ON CONFLICT (slug) DO UPDATE SET is_published = true, updated_at = now();`
      });
      // If RPC not available, fall back to insert without location
      if (rawErr) {
        await supabase.from("venue_branches").insert(branchData);
      }
    } else {
      await supabase.from("venue_branches").insert(branchData);
    }
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidateId, decision, reason, note } = await request.json();

  if (!["approved", "rejected", "needs_review"].includes(decision)) {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  }

  if (decision !== "approved" && !reason) {
    return NextResponse.json({ error: "reason_required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Update candidate status
  const { error } = await supabase
    .from("venue_candidates")
    .update({
      status: decision,
      approved_for_publication: decision === "approved",
      moderation_reason: reason || null,
      reviewed_at: new Date().toISOString(),
      ...(note ? { moderation_note: note } : {}),
    })
    .eq("id", candidateId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-publish to venue_branches on approval
  if (decision === "approved") {
    try {
      await publishToVenueBranches(supabase, candidateId);
    } catch (publishErr) {
      const msg = publishErr instanceof Error ? publishErr.message : "publish_failed";
      return NextResponse.json({ ok: true, warning: `Approved but publish failed: ${msg}` });
    }
  }

  return NextResponse.json({ ok: true });
}
