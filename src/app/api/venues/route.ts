import { getPublishedBranches } from "@/lib/supabase/venues";
import { calculateFocusScore } from "@/lib/recommendations/focus-score";

const cityCodes = new Set(["riyadh", "majmaah"]);
const venueTypes = new Set(["cafe", "library", "coworking"]);
const sortOptions = new Set(["default", "name", "rating"]);

type PublishedBranch = Awaited<ReturnType<typeof getPublishedBranches>>[number];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get("city");
  const query = params.get("q")?.trim().slice(0, 80) ?? "";
  const venueType = params.get("type");
  const sort = params.get("sort") ?? "default";
  const openNow = params.get("openNow") === "true";
  const requestedLimit = Number(params.get("limit") ?? "50");
  const requestedPage = Number(params.get("page") ?? "1");
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(50, requestedLimit)) : 50;
  const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(100, requestedPage)) : 1;

  if (city !== null && !cityCodes.has(city)) {
    return Response.json({ error: "Unsupported city." }, { status: 400 });
  }
  if (venueType !== null && !venueTypes.has(venueType)) {
    return Response.json({ error: "Unsupported venue type." }, { status: 400 });
  }
  if (!sortOptions.has(sort)) {
    return Response.json({ error: "Unsupported sort." }, { status: 400 });
  }

  try {
    const branches = await getPublishedBranches(city ?? undefined);
    const normalizedQuery = query.toLocaleLowerCase("ar");
    const filteredBranches = branches
      .filter((branch) => {
        const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
        const branchCity = Array.isArray(branch.cities) ? branch.cities[0] : branch.cities;
        if (venueType && venue?.venue_type !== venueType) return false;
        if (openNow && !isOpenNow(branch.opening_hours)) return false;
        if (!normalizedQuery) return true;
        return [
          venue?.name_ar,
          venue?.name_en,
          branch.name_ar,
          branch.name_en,
          branch.address_ar,
          branchCity?.name_ar,
          branchCity?.name_en,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("ar").includes(normalizedQuery));
      })
      .sort((left, right) => compareBranches(left, right, sort));
    const offset = (page - 1) * limit;
    const visibleBranches = filteredBranches.slice(offset, offset + limit);
    return Response.json({
      branches: visibleBranches,
      count: visibleBranches.length,
      total: filteredBranches.length,
      page,
      hasMore: offset + visibleBranches.length < filteredBranches.length,
    });
  } catch {
    return Response.json({ error: "Venue data is temporarily unavailable." }, { status: 503 });
  }
}

function compareBranches(left: PublishedBranch, right: PublishedBranch, sort: string) {
  if (sort === "name") {
    const leftVenue = Array.isArray(left.venues) ? left.venues[0] : left.venues;
    const rightVenue = Array.isArray(right.venues) ? right.venues[0] : right.venues;
    return (leftVenue?.name_en ?? left.name_en).localeCompare(rightVenue?.name_en ?? right.name_en);
  }
  if (sort === "rating") {
    const leftScore = left.evidence ? calculateFocusScore(left.evidence) : null;
    const rightScore = right.evidence ? calculateFocusScore(right.evidence) : null;
    const leftRating =
      leftScore?.status === "scored" ? leftScore.score : (left.enrichment?.preliminaryRating ?? -1);
    const rightRating =
      rightScore?.status === "scored"
        ? rightScore.score
        : (right.enrichment?.preliminaryRating ?? -1);
    return rightRating - leftRating;
  }
  return 0;
}

function isOpenNow(hours: PublishedBranch["opening_hours"]) {
  if (!hours?.length) return false;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const today = hours.find((item) => item.day_of_week === dayMap[parts.weekday]);
  if (!today || today.is_closed || !today.opens_at || !today.closes_at) return false;
  const current = `${parts.hour}:${parts.minute}`;
  const opensAt = today.opens_at.slice(0, 5);
  const closesAt = today.closes_at.slice(0, 5);
  if (closesAt < opensAt) return current >= opensAt || current < closesAt;
  return current >= opensAt && current < closesAt;
}
