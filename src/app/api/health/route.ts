import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/health — Read-only Supabase connection test
export async function GET() {
  try {
    const supabase = await createClient();

    // Minimal read-only probe — PGRST202 confirms we reached Supabase successfully
    const { error } = await supabase.rpc("now").single();

    const connected =
      !error || error.code === "PGRST202" || error.code === "PGRST116";

    return NextResponse.json(
      {
        status: connected ? "ok" : "error",
        connected,
        ...(error && !connected && { detail: error.message }),
      },
      { status: connected ? 200 : 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { status: "error", connected: false, message },
      { status: 500 }
    );
  }
}
