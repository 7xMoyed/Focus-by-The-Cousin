import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { isValidFounderSession } from "@/lib/founder-session";

type PublishableCandidate = {
  id: string;
  research_key: string;
  status: string;
  approved_for_publication: boolean;
  published_branch_id: string | null;
  duplicate_status: string;
  venue_type: string;
  name_ar: string;
  name_en: string;
  branch_name_ar: string | null;
  branch_name_en: string | null;
  city_code: string;
  address_ar: string | null;
  google_maps_url: string | null;
  official_instagram_url: string | null;
  official_website_url: string | null;
  why_it_may_fit: string;
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  if (!isValidFounderSession(request.cookies.get("founder_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidateId } = (await request.json()) as { candidateId?: unknown };
  if (typeof candidateId !== "string" || !/^[0-9a-f-]{36}$/i.test(candidateId)) {
    return NextResponse.json({ error: "invalid_candidate" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("venue_candidates")
    .select(
      "id,research_key,status,approved_for_publication,published_branch_id,duplicate_status,venue_type,name_ar,name_en,branch_name_ar,branch_name_en,city_code,address_ar,google_maps_url,official_instagram_url,official_website_url,why_it_may_fit",
    )
    .eq("id", candidateId)
    .maybeSingle<PublishableCandidate>();
  if (error || !data) {
    return NextResponse.json({ error: "candidate_not_found" }, { status: 404 });
  }
  if (data.status !== "approved") {
    return NextResponse.json({ error: "candidate_must_be_approved" }, { status: 409 });
  }
  if (data.duplicate_status !== "no_visible_match") {
    return NextResponse.json({ error: "resolve_duplicate_before_publish" }, { status: 409 });
  }
  if (!data.branch_name_ar || !data.branch_name_en || !data.google_maps_url) {
    return NextResponse.json({ error: "branch_identity_incomplete" }, { status: 409 });
  }

  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", data.city_code)
    .maybeSingle<{ id: string }>();
  if (cityError || !city) {
    return NextResponse.json({ error: "city_not_found" }, { status: 409 });
  }

  const venueSlug = toSlug(data.name_en);
  if (!venueSlug) {
    return NextResponse.json({ error: "invalid_venue_name" }, { status: 409 });
  }
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .upsert(
      {
        name_ar: data.name_ar,
        name_en: data.name_en,
        slug: venueSlug,
        venue_type: data.venue_type,
        description_ar: data.why_it_may_fit || null,
        ...(data.official_instagram_url
          ? {
              instagram_handle: data.official_instagram_url
                .replace(/.*instagram\.com\//, "")
                .replace(/\/$/, ""),
            }
          : {}),
        ...(data.official_website_url ? { website_url: data.official_website_url } : {}),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single<{ id: string }>();
  if (venueError || !venue) {
    return NextResponse.json(
      { error: venueError?.message ?? "venue_publish_failed" },
      { status: 500 },
    );
  }

  const branchSlug = toSlug(data.research_key);
  const branchFields = {
    venue_id: venue.id,
    city_id: city.id,
    name_ar: data.branch_name_ar,
    name_en: data.branch_name_en,
    slug: branchSlug,
    address_ar: data.address_ar,
    google_maps_url: data.google_maps_url,
    is_published: true,
    updated_at: new Date().toISOString(),
  };

  let publishedBranchId = data.published_branch_id;
  if (publishedBranchId) {
    const { error: branchError } = await supabase
      .from("venue_branches")
      .update(branchFields)
      .eq("id", publishedBranchId);
    if (branchError) {
      return NextResponse.json({ error: branchError.message }, { status: 500 });
    }
  } else {
    const { data: branch, error: branchError } = await supabase
      .from("venue_branches")
      .upsert(branchFields, { onConflict: "slug" })
      .select("id")
      .single<{ id: string }>();
    if (branchError || !branch) {
      return NextResponse.json(
        { error: branchError?.message ?? "branch_publish_failed" },
        { status: 500 },
      );
    }
    publishedBranchId = branch.id;
  }

  const { error: candidateError } = await supabase
    .from("venue_candidates")
    .update({
      approved_for_publication: true,
      published_branch_id: publishedBranchId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);
  if (candidateError) {
    return NextResponse.json({ error: candidateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, branchId: publishedBranchId });
}
