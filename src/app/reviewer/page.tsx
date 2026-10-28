import type { Metadata } from "next";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { ReviewerPortal } from "@/features/reviewer/reviewer-portal";

export const metadata: Metadata = { title: "Reviewer Portal", robots: { index: false, follow: false } };
export default function Page() { return <ExperienceShell><section className="focus-surface w-full max-w-4xl rounded-[2rem] p-5 sm:p-8"><ReviewerPortal /></section></ExperienceShell>; }
