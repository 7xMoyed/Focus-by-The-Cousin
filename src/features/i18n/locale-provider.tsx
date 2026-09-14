"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export type Locale = "ar" | "en";

const preferenceKey = "focus-locale";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Locale {
  const saved = window.localStorage.getItem(preferenceKey);
  if (saved === "ar" || saved === "en") return saved;
  return window.navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function getServerSnapshot(): Locale {
  return "en";
}

function chooseLocale(locale: Locale) {
  window.localStorage.setItem(preferenceKey, locale);
  listeners.forEach((listener) => listener());
}

const LocaleContext = createContext<{
  locale: Locale;
  chooseLocale: (locale: Locale) => void;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return <LocaleContext value={{ locale, chooseLocale }}>{children}</LocaleContext>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
