"use client";

import { useSyncExternalStore } from "react";

import { useLocale } from "@/features/i18n/locale-provider";
import { useTheme } from "@/features/theme/theme-provider";

export function ThemeToggle() {
  const { locale } = useLocale();
  const { resolvedTheme, toggleTheme } = useTheme();
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const dark = resolvedTheme === "dark";
  const label = !ready
    ? locale === "ar"
      ? "تغيير المظهر"
      : "Change theme"
    : dark
      ? locale === "ar"
        ? "فعّل الوضع الفاتح"
        : "Use light mode"
      : locale === "ar"
        ? "فعّل الوضع الداكن"
        : "Use dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="header-action-pill inline-flex w-10 items-center justify-center px-0 text-base"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{ready && dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
