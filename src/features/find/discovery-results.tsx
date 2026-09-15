"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FloatingPanel } from "@/components/experience/floating-panel";
import { priorityChoices } from "@/features/find/find-copy";
import { DISCOVERY_STORAGE_KEY } from "@/features/find/types";
import type { DiscoveryAnswers, StoredDiscoveryState } from "@/features/find/types";
import { useLocale } from "@/features/i18n/locale-provider";

type Branch = {
  id: string;
  name_ar: string;
  name_en: string;
  address_ar: string | null;
  google_maps_url: string | null;
  average_spend_min: number | null;
  average_spend_max: number | null;
  venues:
    | { name_ar: string; name_en: string; venue_type: string }
    | Array<{ name_ar: string; name_en: string; venue_type: string }>;
};

export function DiscoveryResults() {
  const { locale } = useLocale();
  const [answers, setAnswers] = useState<DiscoveryAnswers | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const raw = window.localStorage.getItem(DISCOVERY_STORAGE_KEY);
        if (!raw) {
          setLoading(false);
          return;
        }
        const state = JSON.parse(raw) as StoredDiscoveryState;
        setAnswers(state.answers);
        if (!state.answers.city) {
          setLoading(false);
          return;
        }
        const response = await fetch(`/api/venues?city=${state.answers.city}`);
        if (!response.ok) throw new Error("Unable to load places.");
        const payload = (await response.json()) as { branches?: Branch[] };
        setBranches(payload.branches?.slice(0, 3) ?? []);
      } catch {
        setBranches([]);
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, []);

  const copy =
    locale === "ar"
      ? {
          eyebrow: "أماكنك المقترحة ✨",
          title: "هذي أماكن مناسبة لجلستك",
          subtitle:
            "نعرض لك الأماكن المتاحة في مدينتك ونحفظ تفضيلات جلستك. ومع اكتمال تقييمات الفروع بنرتبها لك بدقة أكبر.",
          empty: "ما لقينا أماكن منشورة في هالمنطقة حاليًا. جرّب تعديل اختياراتك.",
          restart: "عدّل اختياراتي",
          directions: "افتح في الخرائط",
          spend: "متوسط الصرف",
        }
      : {
          eyebrow: "Your suggested places ✨",
          title: "These places fit your session",
          subtitle:
            "We’ll show available places in your city and keep your session preferences. Ranking gets sharper as more branch ratings are added.",
          empty: "We don’t have published places in this area yet. Try changing your choices.",
          restart: "Change my choices",
          directions: "Open in Maps",
          spend: "Average spend",
        };

  const selectedPriorities = answers
    ? priorityChoices[locale].filter((choice) => answers.priorities.includes(choice.value))
    : [];

  return (
    <FloatingPanel>
      <div className="animate-find-step">
        <p className="text-sm font-semibold text-sky-800">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{copy.subtitle}</p>
        {selectedPriorities.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedPriorities.map((item) => (
              <span
                key={item.value}
                className="rounded-full bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900"
              >
                {item.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-7 space-y-3">
          {loading
            ? [0, 1].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
              ))
            : null}
          {!loading &&
            branches.map((branch) => {
              const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
              const venueName = locale === "ar" ? venue?.name_ar : venue?.name_en;
              const branchName = locale === "ar" ? branch.name_ar : branch.name_en;
              return (
                <article
                  key={branch.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{venueName}</h2>
                      <p className="mt-1 text-sm text-slate-500">{branchName}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                      🎯 Focus
                    </span>
                  </div>
                  {branch.address_ar ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">📍 {branch.address_ar}</p>
                  ) : null}
                  {branch.average_spend_min !== null ? (
                    <p className="mt-2 text-sm text-slate-600">
                      💸 {copy.spend}: {branch.average_spend_min}
                      {branch.average_spend_max ? `–${branch.average_spend_max}` : ""} SAR
                    </p>
                  ) : null}
                  {branch.google_maps_url ? (
                    <a
                      href={branch.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex min-h-10 items-center rounded-full bg-slate-100 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                    >
                      {copy.directions} ↗
                    </a>
                  ) : null}
                </article>
              );
            })}
          {!loading && branches.length === 0 ? (
            <p className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              {copy.empty}
            </p>
          ) : null}
        </div>

        <Link href="/find" className="find-primary-button mt-7 w-full">
          {copy.restart}
        </Link>
      </div>
    </FloatingPanel>
  );
}
