import { createSupabaseClient } from "@/lib/supabase/client";

const usernamePattern = /^[a-z0-9._]{3,20}$/;

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase() ?? "";

  if (!usernamePattern.test(username)) {
    return Response.json({ available: false, valid: false }, { status: 400 });
  }

  try {
    const { data, error } = await createSupabaseClient().rpc("is_username_available", {
      candidate: username,
    });

    if (error) throw error;

    return Response.json({ available: data === true, valid: true });
  } catch {
    return Response.json(
      { available: false, valid: true, error: "Availability check is temporarily unavailable." },
      { status: 503 },
    );
  }
}
