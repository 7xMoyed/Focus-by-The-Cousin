import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
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

// Only allow editing safe fields — no status, no id
const EDITABLE_FIELDS = [
  "focus_eligibility",
  "confidence",
  "why_it_may_fit",
  "possible_concerns",
  "duplicate_notes",
  "name_ar",
  "name_en",
  "branch_name_ar",
  "branch_name_en",
  "address_ar",
  "address_en",
  "google_maps_url",
  "official_instagram_url",
  "official_website_url",
] as const;

export async function PATCH(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidateId, updates } = await request.json();
  if (!candidateId || !updates) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Filter to only editable fields
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => EDITABLE_FIELDS.includes(k as typeof EDITABLE_FIELDS[number]))
  );

  if (!Object.keys(safe).length) {
    return NextResponse.json({ error: "no_valid_fields" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("venue_candidates")
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq("id", candidateId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
