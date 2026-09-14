import Link from "next/link";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/experience/language-switcher";

const backgroundVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

export function ExperienceShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-white">
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-0 bg-[#032033]/45" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link
          href="/"
          dir="ltr"
          className="text-2xl tracking-tight sm:text-3xl"
          style={{ fontFamily: '"Instrument Serif", serif' }}
        >
          Focus by The Cousin<sup className="text-xs">®</sup>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6">
        {children}
      </main>
    </div>
  );
}
