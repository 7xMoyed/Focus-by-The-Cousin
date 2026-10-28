"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/features/i18n/locale-provider";

export function AccountPage() {
  const { locale } = useLocale();
  const { user, loading, openAuth, signOut } = useAuth();
  const ar = locale === "ar";
  if (loading) return <div className="h-48 animate-pulse rounded-3xl bg-[hsl(var(--surface-soft))]" />;
  if (!user) return <div className="text-center"><h1 className="text-3xl font-semibold">{ar ? "حسابك في Focus" : "Your Focus account"}</h1><p className="focus-muted-text mt-3">{ar ? "سجّل دخولك للوصول لمفضلاتك ومشاركاتك." : "Sign in to access your favorites and activity."}</p><button type="button" onClick={() => openAuth()} className="find-primary-button mt-7">{ar ? "تسجيل الدخول" : "Sign in"}</button></div>;
  return <div><p className="focus-accent-text text-sm font-semibold">The Cousin</p><h1 className="mt-2 text-3xl font-semibold">{ar ? "حسابي" : "My account"}</h1><p className="focus-muted-text mt-3" dir="ltr">{user.email}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><Link href="/favorites" className="find-choice">🤍 {ar ? "مفضلاتي" : "My favorites"}</Link><Link href="/reviewer" className="find-choice">📝 {ar ? "بوابة المقيّم" : "Reviewer portal"}</Link></div><button type="button" onClick={() => void signOut()} className="focus-chip mt-7">{ar ? "تسجيل الخروج" : "Sign out"}</button></div>;
}
