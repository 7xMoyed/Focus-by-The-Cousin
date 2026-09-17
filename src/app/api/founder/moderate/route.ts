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

  const supabase = getServiceClient();
  const { error } = await supabase.rpc("moderate_venue_candidate", {
    candidate_id: candidateId,
    decision,
    reason: reason || null,
    note: note || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
