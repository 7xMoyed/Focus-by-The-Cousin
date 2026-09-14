"use client";

import { useLocale } from "@/features/i18n/locale-provider";

export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const { locale, chooseLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language / اللغة"
      className={`inline-flex items-center gap-1 rounded-full border p-1 text-xs ${
        light
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : "border-white/20 bg-white/5 text-white"
      }`}
    >
      {(["ar", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => chooseLocale(option)}
          aria-pressed={locale === option}
          className={`min-w-11 cursor-pointer rounded-full px-2 py-1.5 transition-colors ${
            locale === option
              ? light
                ? "bg-white text-slate-950 shadow-sm"
                : "bg-white/20 text-white"
              : light
                ? "hover:bg-slate-200"
                : "hover:bg-white/10"
          }`}
        >
          {option === "ar" ? "عربي" : "EN"}
        </button>
      ))}
    </div>
  );
}
