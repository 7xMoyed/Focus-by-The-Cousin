"use client";

import { useCallback, useEffect, useState } from "react";

type Submission = { id: string; status: string; cafe_name: string; city_code: string; neighborhood: string | null; evaluation: Record<string, string | number>; review_text: string | null; overall_rating: number | null; founder_note: string | null; reviewer_profiles: { display_name: string; slug: string } };

export function ReviewerModeration() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); const response = await fetch("/api/founder/reviewer-submissions", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) setError(payload.error ?? "تعذر التحميل"); else setItems(payload.submissions ?? []); setLoading(false); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function moderate(id: string, status: string) { const note = status === "approved" ? "" : window.prompt("اكتب السبب أو التعديل المطلوب") ?? ""; if (status !== "approved" && !note.trim()) return; const response = await fetch("/api/founder/reviewer-submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "submission", id, status, note }) }); if (!response.ok) { const payload = await response.json(); setError(payload.error ?? "تعذر التحديث"); return; } await load(); }
  if (loading) return <div className="h-48 animate-pulse rounded-3xl bg-muted" />;
  return <div><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-muted-foreground">Founder moderation</p><h1 className="mt-2 text-3xl font-semibold">مراجعات المقيّمين</h1></div><a href="/founder" className="focus-chip">لوحة الأماكن</a></div>{error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-800">{error}</p> : null}<div className="mt-7 grid gap-4">{items.map((item) => <article key={item.id} className="focus-surface rounded-3xl p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{item.cafe_name || "بدون اسم"}</h2><p className="focus-muted-text mt-1 text-sm">{item.reviewer_profiles?.display_name} · {item.city_code} · {item.neighborhood}</p></div><span className="focus-chip">{item.status}</span></div>{item.review_text ? <p className="mt-4 leading-7">{item.review_text}</p> : null}<pre className="focus-soft-surface mt-4 overflow-x-auto rounded-2xl p-3 text-xs">{JSON.stringify(item.evaluation, null, 2)}</pre>{item.status === "submitted" ? <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void moderate(item.id, "approved")} className="find-primary-button">اعتماد</button><button type="button" onClick={() => void moderate(item.id, "changes_requested")} className="focus-chip">طلب تعديل</button><button type="button" onClick={() => void moderate(item.id, "rejected")} className="focus-chip">رفض</button></div> : null}</article>)}</div></div>;
}
