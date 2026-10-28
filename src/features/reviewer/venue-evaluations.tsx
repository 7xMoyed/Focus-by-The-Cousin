"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useLocale } from "@/features/i18n/locale-provider";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type Evaluation = { id: string; reviewer_slug: string; reviewer_name: string; review_text: string | null; visited_on: string | null; overall_rating: number | null; evaluation: Record<string, string | number> };

export function VenueEvaluations({ branchId }: { branchId: string }) {
  const { locale } = useLocale(); const [rows, setRows] = useState<Evaluation[]>([]); const ar = locale === "ar";
  useEffect(() => { void getBrowserSupabaseClient().rpc("list_public_reviewer_evaluations" as never, { p_reviewer_slug: null, p_branch_id: branchId } as never).returns<Evaluation[]>().then(({ data }) => setRows(data ?? [])); }, [branchId]);
  if (!rows.length) return null;
  return <section className="mt-6"><h2 className="text-xl font-semibold">{ar ? "تقييم مقيّمي Focus" : "Focus evaluator reviews"}</h2><div className="mt-3 grid gap-3">{rows.map((row) => <article key={row.id} className="focus-soft-surface rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><Link href={`/evaluators/${row.reviewer_slug}`} className="font-semibold text-[hsl(var(--focus-accent))]">🕵️ {row.reviewer_name}</Link>{row.overall_rating ? <strong dir="ltr">⭐ {row.overall_rating}/5</strong> : null}</div>{row.visited_on ? <p className="focus-muted-text mt-1 text-xs">{ar ? "زيارة" : "Visited"}: {row.visited_on}</p> : null}{row.review_text ? <p className="mt-3 text-sm leading-7">{row.review_text}</p> : null}</article>)}</div></section>;
}
