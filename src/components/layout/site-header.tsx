"use client";

import { LanguageSwitcher } from "@/components/experience/language-switcher";
import { HeaderActions } from "@/components/layout/header-actions";
import { useLocale } from "@/features/i18n/locale-provider";
import { messages } from "@/features/i18n/messages";

const navigation = ["home", "places", "about", "journal", "reachUs"] as const;

export function SiteHeader() {
  const { locale } = useLocale();
  const copy = messages[locale];

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-3 px-5 pt-5 pb-3 sm:flex-nowrap sm:px-8 sm:py-6">
      <a
        href="#main-content"
        dir="ltr"
        className="shrink-0 text-lg tracking-tight whitespace-nowrap text-foreground min-[390px]:text-xl sm:text-3xl"
        style={{ fontFamily: '"Instrument Serif", serif' }}
      >
        Focus by The Cousin<sup className="text-xs">®</sup>
      </a>

      <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
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

      <div className="order-3 flex w-full shrink-0 items-center justify-center gap-2 sm:order-none sm:w-auto sm:justify-end">
        <HeaderActions />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
