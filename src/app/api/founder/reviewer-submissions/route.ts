import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { isValidFounderSession } from "@/lib/founder-session";

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
function authorized(request: NextRequest) { return isValidFounderSession(request.cookies.get("founder_auth")?.value); }

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = service();
  const [submissions, reviewers] = await Promise.all([
    supabase.from("reviewer_submissions").select("*,reviewer_profiles!inner(slug,display_name,is_approved,is_public)").order("updated_at", { ascending: false }),
    supabase.from("reviewer_profiles").select("*").order("created_at", { ascending: false }),
  ]);
  if (submissions.error || reviewers.error) return NextResponse.json({ error: submissions.error?.message ?? reviewers.error?.message }, { status: 500 });
  return NextResponse.json({ submissions: submissions.data ?? [], reviewers: reviewers.data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { userId?: string; slug?: string; displayName?: string; cityCode?: string };
  if (!body.userId || !body.slug?.match(/^[a-z0-9-]{3,40}$/) || !body.displayName?.trim()) return NextResponse.json({ error: "Invalid reviewer profile" }, { status: 400 });
  const { data, error } = await service().from("reviewer_profiles").upsert({ user_id: body.userId, slug: body.slug, display_name: body.displayName.trim(), city_code: body.cityCode || null, is_approved: true, approved_at: new Date().toISOString() }, { onConflict: "user_id" }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { type?: "submission" | "reviewer"; id?: string; status?: string; note?: string; approved?: boolean; public?: boolean };
  const supabase = service();
  if (body.type === "reviewer" && body.id) {
    const { data, error } = await supabase.from("reviewer_profiles").update({ is_approved: Boolean(body.approved), is_public: Boolean(body.public), approved_at: body.approved ? new Date().toISOString() : null }).eq("user_id", body.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  if (body.type === "submission" && body.id && ["approved", "rejected", "changes_requested"].includes(body.status ?? "")) {
    const { data, error } = await supabase.from("reviewer_submissions").update({ status: body.status, founder_note: body.note?.trim() || null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", body.id).eq("status", "submitted").select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
