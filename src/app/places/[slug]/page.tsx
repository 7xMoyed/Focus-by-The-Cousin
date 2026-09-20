import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceShell } from "@/components/experience/experience-shell";
import { VenueDetail } from "@/features/venues/venue-detail";
import { getPublishedBranches } from "@/lib/supabase/venues";

export const metadata: Metadata = {
  title: "Place details | Focus by The Cousin",
};

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const branch = (await getPublishedBranches()).find((item) => item.slug === slug);
  if (!branch) notFound();
  return (
    <ExperienceShell>
      <VenueDetail branch={branch} />
    </ExperienceShell>
  );
}
