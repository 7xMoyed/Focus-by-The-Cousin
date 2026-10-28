import type { Metadata } from "next";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { EvaluatorsList } from "@/features/reviewer/public-evaluators";
export const metadata: Metadata = { title: "Focus Evaluators | مقيّمو Focus" };
export default function Page() { return <ExperienceShell><section className="focus-surface w-full max-w-4xl rounded-[2rem] p-6 sm:p-9"><EvaluatorsList /></section></ExperienceShell>; }
