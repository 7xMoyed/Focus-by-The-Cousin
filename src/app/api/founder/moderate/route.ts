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
  return NextResponse.json({ ok: true });
}
