"use client";

/* Reviewer avatars may come from founder-approved external sources. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";

import { useLocale } from "@/features/i18n/locale-provider";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type Reviewer = { slug: string; display_name: string; bio: string | null; city_code: string | null; avatar_url: string | null; approved_review_count: number };
type Evaluation = { id: string; reviewer_slug: string; reviewer_name: string; cafe_name: string; city_code: string; neighborhood: string | null; evaluation: Record<string, string | number>; review_text: string | null; visited_on: string | null; overall_rating: number | null };

export function EvaluatorsList() {
  const { locale } = useLocale(); const [rows, setRows] = useState<Reviewer[]>([]); const [loading, setLoading] = useState(true); const ar = locale === "ar";
  useEffect(() => { void getBrowserSupabaseClient().rpc("list_public_reviewer_profiles" as never, { p_slug: null } as never).returns<Reviewer[]>().then(({ data }) => { setRows(data ?? []); setLoading(false); }); }, []);
  return <div><p className="focus-accent-text text-sm font-semibold">✨ Focus</p><h1 className="mt-2 text-3xl font-semibold">{ar ? "تعرّف على مقيّمي Focus" : "Meet the Focus evaluators"}</h1><p className="focus-muted-text mt-3 leading-7">{ar ? "زيارات حقيقية وملاحظات واضحة، وكل تقييم يمر بمراجعة المؤسس قبل ظهوره." : "Real visits and useful observations, reviewed by the founder before publication."}</p>{loading ? <div className="mt-7 h-44 animate-pulse rounded-3xl bg-[hsl(var(--surface-soft))]" /> : rows.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2">{rows.map((row) => <Link key={row.slug} href={`/evaluators/${row.slug}`} className="find-choice"><span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[hsl(var(--focus-accent-soft))] text-xl">{row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : "🕵️"}</span><span><strong className="block">{row.display_name}</strong><span className="focus-muted-text mt-1 block text-xs">{row.approved_review_count} {ar ? "تقييم معتمد" : "approved reviews"}</span></span></Link>)}</div> : <p className="focus-soft-surface mt-7 rounded-3xl p-8 text-center">{ar ? "قريبًا نعرّفكم بأول مقيّمي Focus 👀" : "Meet our first evaluators soon 👀"}</p>}</div>;
}

export function EvaluatorProfile({ slug }: { slug: string }) {
  const { locale } = useLocale(); const [profile, setProfile] = useState<Reviewer | null>(null); const [reviews, setReviews] = useState<Evaluation[]>([]); const [loading, setLoading] = useState(true); const ar = locale === "ar";
  useEffect(() => { const supabase = getBrowserSupabaseClient(); void Promise.all([supabase.rpc("list_public_reviewer_profiles" as never, { p_slug: slug } as never).maybeSingle<Reviewer>(), supabase.rpc("list_public_reviewer_evaluations" as never, { p_reviewer_slug: slug, p_branch_id: null } as never).returns<Evaluation[]>()]).then(([p, r]) => { setProfile(p.data ?? null); setReviews(r.data ?? []); setLoading(false); }); }, [slug]);
  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-[hsl(var(--surface-soft))]" />;
  if (!profile) return <div className="py-10 text-center"><h1 className="text-3xl font-semibold">{ar ? "المقيّم غير موجود" : "Evaluator not found"}</h1><Link href="/evaluators" className="focus-chip mt-6">{ar ? "كل المقيّمين" : "All evaluators"}</Link></div>;
  return <div><Link href="/evaluators" className="find-back-button">{ar ? "→ المقيّمون" : "← Evaluators"}</Link><div className="mt-5 flex items-center gap-4"><span className="grid size-20 place-items-center overflow-hidden rounded-full bg-[hsl(var(--focus-accent-soft))] text-3xl">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : "🕵️"}</span><div><h1 className="text-3xl font-semibold">{profile.display_name}</h1><p className="focus-muted-text mt-1">{profile.city_code === "riyadh" ? (ar ? "الرياض" : "Riyadh") : profile.city_code === "majmaah" ? (ar ? "المجمعة" : "Al Majma’ah") : "Focus"}</p></div></div>{profile.bio ? <p className="focus-muted-text mt-5 max-w-2xl leading-7">{profile.bio}</p> : null}<h2 className="mt-8 text-xl font-semibold">{ar ? "التقييمات المعتمدة" : "Approved evaluations"}</h2><div className="mt-4 grid gap-4">{reviews.map((review) => <article key={review.id} className="focus-soft-surface rounded-3xl p-5"><div className="flex justify-between gap-3"><div><h3 className="text-lg font-semibold">{review.cafe_name}</h3><p className="focus-muted-text text-xs">{review.neighborhood} {review.visited_on ? `· ${review.visited_on}` : ""}</p></div>{review.overall_rating ? <strong dir="ltr">⭐ {review.overall_rating}/5</strong> : null}</div>{review.review_text ? <p className="mt-4 leading-7">{review.review_text}</p> : null}<div className="mt-4 flex flex-wrap gap-2">{Object.entries(review.evaluation).slice(0, 6).map(([key, value]) => <span key={key} className="focus-chip">{key}: {String(value)}</span>)}</div></article>)}</div></div>;
}
