"use client";

import { LanguageSwitcher } from "@/components/experience/language-switcher";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n/locale-provider";
import { messages } from "@/features/i18n/messages";

const navigation = ["home", "places", "about", "journal", "reachUs"] as const;

export function SiteHeader() {
  const { locale } = useLocale();
  const copy = messages[locale];

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-row items-center justify-between gap-3 px-5 py-6 sm:px-8">
      <a
        href="#main-content"
        dir="ltr"
        className="shrink-0 text-xl tracking-tight whitespace-nowrap text-foreground sm:text-3xl"
        style={{ fontFamily: '"Instrument Serif", serif' }}
      >
        Focus by The Cousin<sup className="text-xs">®</sup>
      </a>

      <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
        {navigation.map((item, index) => (
          <a
            key={item}
            href={index === 0 ? "#main-content" : `#${item.toLowerCase()}`}
            aria-current={index === 0 ? "page" : undefined}
            className={`text-sm transition-colors ${
              index === 0 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {copy[item]}
          </a>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher />
        <div className="hidden sm:block">
          <Button className="liquid-glass rounded-full px-4 py-2.5 text-sm whitespace-nowrap text-foreground transition-transform duration-300 hover:scale-[1.03] sm:px-6">
            {copy.beginJourney}
          </Button>
        </div>
      </div>
    </header>
  );
}
