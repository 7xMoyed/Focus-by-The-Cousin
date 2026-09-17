import type { Metadata } from "next";

import { ExperienceShell } from "@/components/experience/experience-shell";
import { FounderDashboard } from "@/features/founder/founder-dashboard";

export const metadata: Metadata = {
  title: "Founder Venue Review",
  description: "Private venue research and moderation workspace.",
  robots: { index: false, follow: false },
};

export default function FounderPage() {
  return (
    <ExperienceShell>
      <FounderDashboard />
    </ExperienceShell>
  );
}
