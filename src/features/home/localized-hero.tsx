"use client";

import Link from "next/link";

import { useLocale } from "@/features/i18n/locale-provider";
import { messages } from "@/features/i18n/messages";

export function LocalizedHero() {
  const { locale } = useLocale();
  const copy = messages[locale];

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center px-5 pt-10 pb-[max(3rem,env(safe-area-inset-bottom))] text-center sm:px-6 sm:py-[90px]"
    >
      <h1
        className={`animate-fade-rise max-w-6xl text-[2.75rem] font-normal sm:text-7xl md:text-8xl ${
          locale === "ar" ? "leading-[1.25] tracking-normal" : "leading-[0.95] tracking-[-2.46px]"
        }`}
        style={{
          fontFamily: locale === "ar" ? "var(--font-thmanyah)" : '"Instrument Serif", serif',
        }}
      >
        <span className="block">{copy.heroTitleFirst}</span>
        <span className="block text-white/64">{copy.heroTitleSecond}</span>
      </h1>

      <p className="hero-support-copy animate-fade-rise-delay mt-6 max-w-xl text-[0.98rem] leading-[1.75] text-white/78 sm:mt-8 sm:max-w-2xl sm:text-lg">
        {copy.heroDescription}
      </p>

      <Link
        href="/find"
        className="hero-primary-cta animate-fade-rise-delay-2 mt-9 inline-flex min-h-14 min-w-48 cursor-pointer items-center justify-center rounded-full px-10 py-4 text-base font-medium transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e4d48e] sm:mt-11"
      >
        {copy.findYourPlace}
      </Link>
    </main>
  );
}
