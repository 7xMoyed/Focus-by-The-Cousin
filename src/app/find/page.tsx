import type { Metadata } from "next";

import { ExperienceShell } from "@/components/experience/experience-shell";
import { FindPreview } from "@/features/find/find-preview";

export const metadata: Metadata = {
  title: "Find Your Place",
  description: "A calmer way to find a place for your next focus session.",
};

export default function FindPage() {
  return (
    <ExperienceShell>
      <FindPreview />
    </ExperienceShell>
  );
}
