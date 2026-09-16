import type { Metadata } from "next";

import { ExperienceShell } from "@/components/experience/experience-shell";
import { DiscoveryFlow } from "@/features/find/discovery-flow";

export const metadata: Metadata = {
  title: "Find Your Place | لق مكانك",
  description:
    "جاوب على كم سؤال خفيف ونساعدك تلقى مكان يناسب جلستك. Find a place that fits your focus session.",
  alternates: {
    canonical: "/find",
  },
  openGraph: {
    type: "website",
    title: "Find Your Place | لق مكانك",
    description: "A quick, friendly way to find a place that fits your study or work session.",
    url: "/find",
    siteName: "Focus by The Cousin",
    locale: "ar_SA",
    alternateLocale: ["en_US"],
  },
};

export default function FindPage() {
  return (
    <ExperienceShell>
      <DiscoveryFlow />
    </ExperienceShell>
  );
}
