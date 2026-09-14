"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n/locale-provider";
import { messages } from "@/features/i18n/messages";

export function LocalizedHero() {
  const { locale } = useLocale();
  const copy = messages[locale];

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center px-6 py-[90px] text-center"
    >
      <h1
        className={`animate-fade-rise max-w-7xl text-5xl font-normal sm:text-7xl md:text-8xl ${
          locale === "ar" ? "leading-[1.25] tracking-normal" : "leading-[0.95] tracking-[-2.46px]"
        }`}
        style={{
          fontFamily: locale === "ar" ? "var(--font-thmanyah)" : '"Instrument Serif", serif',
        }}
      >
        {copy.heroBefore}
        <em className="not-italic text-muted-foreground">{copy.heroFocus}</em>
        {copy.heroMiddle}
        <em className="not-italic text-muted-foreground">{copy.heroEnd}</em>
      </h1>

      <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {copy.heroDescription}
      </p>

      <Button className="liquid-glass hero-cta animate-fade-rise-delay-2 mt-12 cursor-pointer rounded-full px-14 py-5 text-base text-foreground transition-transform duration-300 hover:scale-[1.03]">
        {copy.findYourPlace}
      </Button>
    </main>
  );
}
