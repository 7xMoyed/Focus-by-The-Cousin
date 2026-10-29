"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/features/i18n/locale-provider";
import { loadSavedVenueIds } from "@/features/saved-venues/saved-venues";
import { RichVenueCard, type DisplayBranch } from "@/features/venues/rich-venue-card";
import { fetchAllPublishedVenuePages } from "@/features/venues/public-venue-api";

export function FavoritesPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user, loading: authLoading, openAuth } = useAuth();
  const [branches, setBranches] = useState<DisplayBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const copy = locale === "ar" ? ar : en;

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void Promise.all([
      loadSavedVenueIds(true),
      fetchAllPublishedVenuePages(),
    ]).then(([ids, publishedBranches]) => {
      if (active) setBranches(publishedBranches.filter((branch) => ids.has(branch.id)));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authLoading, user]);

  if (authLoading || (user && loading)) return <div className="h-64 animate-pulse rounded-3xl bg-[hsl(var(--surface-soft))]" />;
  if (!user) return <Empty title={copy.guestTitle} detail={copy.guestDetail} action={copy.signIn} onClick={() => openAuth({ kind: "account" })} />;
  if (!branches.length) return <Empty title={copy.emptyTitle} detail={copy.emptyDetail} action={copy.browse} onClick={() => router.push("/find")} />;
  return <div><h1 className="text-3xl font-semibold">{copy.title}</h1><p className="focus-muted-text mt-2">{copy.detail}</p><div className="mt-7 grid gap-5 lg:grid-cols-2">{branches.map((branch) => <RichVenueCard key={branch.id} branch={branch} locale={locale} />)}</div></div>;
}

function Empty({ title, detail, action, onClick }: { title: string; detail: string; action: string; onClick: () => void }) {
  return <div className="py-12 text-center"><span className="text-5xl">🤍</span><h1 className="mt-5 text-3xl font-semibold">{title}</h1><p className="focus-muted-text mx-auto mt-3 max-w-md leading-7">{detail}</p><button type="button" onClick={onClick} className="find-primary-button mt-7">{action}</button></div>;
}
const ar = { title: "مفضلاتي 🤍", detail: "أماكنك المحفوظة معك في أي جهاز.", guestTitle: "مفضلاتك تنتظرك", guestDetail: "سجّل دخولك عشان تحفظ الأماكن وترجع لها من أي جهاز.", signIn: "تسجيل الدخول", emptyTitle: "مفضلاتك للحين فاضية!", emptyDetail: "كل ما لقيت مكان يعجبك، اضغط علامة الحفظ وخلّه هنا.", browse: "اكتشف الأماكن" };
const en = { title: "My favorites 🤍", detail: "Your saved places, available on every device.", guestTitle: "Your favorites are waiting", guestDetail: "Sign in to save places and find them on any device.", signIn: "Sign in", emptyTitle: "No favorites yet!", emptyDetail: "When you find a place you like, save it and it will appear here.", browse: "Discover places" };
