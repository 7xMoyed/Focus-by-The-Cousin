import type { Metadata } from "next";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { EvaluatorProfile } from "@/features/reviewer/public-evaluators";
export const metadata: Metadata = { title: "Focus Evaluator" };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <ExperienceShell><section className="focus-surface w-full max-w-4xl rounded-[2rem] p-6 sm:p-9"><EvaluatorProfile slug={slug} /></section></ExperienceShell>; }
