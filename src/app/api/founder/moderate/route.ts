import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isValidFounderSession } from "@/lib/founder-session";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  if (!isValidFounderSession(request.cookies.get("founder_auth")?.value)) {
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
      moderation_reason: reason || null,
      reviewed_at: new Date().toISOString(),
      ...(note ? { moderation_note: note } : {}),
    })
    .eq("id", candidateId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
