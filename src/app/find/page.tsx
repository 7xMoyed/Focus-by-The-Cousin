import type { Metadata } from "next";

import { ExperienceShell } from "@/components/experience/experience-shell";
import { LocationDiscovery } from "@/features/discovery/location-discovery";
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

export default async function FindPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const questionsEnabled = process.env.NEXT_PUBLIC_FOCUS_DISCOVERY_QUESTIONS_ENABLED === "true";
  return (
    <ExperienceShell>
      {questionsEnabled && mode === "session" ? <DiscoveryFlow /> : <LocationDiscovery />}
    </ExperienceShell>
  );
}
