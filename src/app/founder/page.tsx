import type { Metadata } from "next";
import Link from "next/link";

import { FounderDashboard } from "@/features/founder/founder-dashboard";

export const metadata: Metadata = {
  title: "Founder Venue Review",
  description: "Private venue research and moderation workspace.",
  robots: { index: false, follow: false },
};

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 border-b border-border">
        <Link href="/" dir="ltr" className="text-xl tracking-tight" style={{ fontFamily: '"Instrument Serif", serif' }}>
          Focus by The Cousin<sup className="text-xs">®</sup>
        </Link>
        <div className="flex items-center gap-3"><Link href="/founder/reviewer-submissions" className="focus-chip">مراجعات المقيّمين</Link><span className="text-xs text-muted-foreground">Founder</span></div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <FounderDashboard />
      </main>
    </div>
  );
}
