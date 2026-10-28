"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/features/i18n/locale-provider";

export function DiscoveryNavigation() {
  const { locale } = useLocale();
  const { user, loading, openAuth } = useAuth();
  const copy = locale === "ar" ? ar : en;
  return (
    <nav className="flex min-w-0 items-center gap-1.5" aria-label={copy.label}>
      <Link href="/find" className="header-action-pill">{copy.discover}</Link>
      <Link href="/evaluators" className="header-action-pill hidden sm:inline-flex">{copy.evaluators}</Link>
      {user ? <Link href="/favorites" className="header-action-pill hidden min-[430px]:inline-flex">{copy.favorites}</Link> : null}
      {!loading ? (
        user ? (
          <Link href="/account" className="header-action-pill" aria-label={copy.account}>👤</Link>
        ) : (
          <button type="button" onClick={() => openAuth()} className="header-action-pill">{copy.signIn}</button>
        )
      ) : null}
    </nav>
  );
}
const ar = { label: "التنقل", discover: "اكتشف", favorites: "مفضلاتي 🤍", evaluators: "المقيّمون", account: "حسابي", signIn: "دخول" };
const en = { label: "Navigation", discover: "Discover", favorites: "Favorites 🤍", evaluators: "Evaluators", account: "Account", signIn: "Sign in" };
