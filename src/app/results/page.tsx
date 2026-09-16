import type { Metadata } from "next";

import { ExperienceShell } from "@/components/experience/experience-shell";
import { DiscoveryResults } from "@/features/find/discovery-results";

export const metadata: Metadata = {
  title: "Your Places | أماكنك",
  description: "Focus-friendly places matched to your session.",
  alternates: {
    canonical: "/results",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultsPage() {
  return (
    <ExperienceShell>
      <DiscoveryResults />
    </ExperienceShell>
  );
}
