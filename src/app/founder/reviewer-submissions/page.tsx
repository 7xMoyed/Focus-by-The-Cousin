import type { Metadata } from "next";
import Link from "next/link";
import { ReviewerModeration } from "@/features/founder/reviewer-moderation";

export const metadata: Metadata = { title: "Reviewer moderation", robots: { index: false, follow: false } };
export default function Page() { return <div className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-7xl items-center justify-between border-b border-border px-5 py-6"><Link href="/founder" dir="ltr" className="text-xl">Focus by The Cousin®</Link><span className="text-xs text-muted-foreground">Founder</span></header><main className="mx-auto max-w-5xl px-5 py-8"><ReviewerModeration /></main></div>; }
