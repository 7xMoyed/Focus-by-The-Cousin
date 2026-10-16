"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const preferenceKey = "focus-theme-v1";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    media.removeEventListener("change", listener);
  };
}

function getPreference(): ThemePreference {
  const saved = window.localStorage.getItem(preferenceKey);
  return saved === "light" || saved === "dark" ? saved : "system";
}

function getServerPreference(): ThemePreference {
  return "system";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

function persistThemeCookie(preference: ThemePreference) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (preference === "system") {
    document.cookie = `focus-theme=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }
  document.cookie = `focus-theme=${preference}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

const ThemeContext = createContext<{
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribe, getPreference, getServerPreference);
  const resolvedTheme = typeof window === "undefined" ? "light" : resolveTheme(preference);

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  function setPreference(nextPreference: ThemePreference) {
    if (nextPreference === "system") {
      window.localStorage.removeItem(preferenceKey);
    } else {
      window.localStorage.setItem(preferenceKey, nextPreference);
    }
    persistThemeCookie(nextPreference);
    applyTheme(nextPreference);
    listeners.forEach((listener) => listener());
  }

  function toggleTheme() {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext value={{ preference, resolvedTheme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
