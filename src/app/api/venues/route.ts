import { getPublishedBranches } from "@/lib/supabase/venues";

const cityCodes = new Set(["riyadh", "majmaah"]);

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city");

  if (city !== null && !cityCodes.has(city)) {
    return Response.json({ error: "Unsupported city." }, { status: 400 });
  }

  try {
    const branches = await getPublishedBranches(city ?? undefined);
    return Response.json({ branches });
  } catch {
    return Response.json({ error: "Venue data is temporarily unavailable." }, { status: 503 });
  }
}
