import type { Metadata } from "next";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { AccountPage } from "@/features/auth/account-page";

export const metadata: Metadata = { title: "Account | حسابي", robots: { index: false, follow: false } };
export default function Page() { return <ExperienceShell><section className="focus-surface w-full max-w-2xl rounded-[2rem] p-6 sm:p-9"><AccountPage /></section></ExperienceShell>; }
