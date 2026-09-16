"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FloatingPanel } from "@/components/experience/floating-panel";
import {
  isValidDiscoveryAnswers,
  readStoredDiscoveryState,
} from "@/features/find/discovery-session";
import {
  contextualQuestion,
  locationChoices,
  priorityChoices,
  sessionChoices,
} from "@/features/find/find-copy";
import { DISCOVERY_STORAGE_KEY } from "@/features/find/types";
import type { DiscoveryAnswers, StoredDiscoveryState } from "@/features/find/types";
import { useLocale } from "@/features/i18n/locale-provider";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

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

type SavedSession = {
  answers: DiscoveryAnswers;
  client_session_id: string | null;
};

export function DiscoveryResults() {
  const { locale } = useLocale();
  const router = useRouter();
  const [answers, setAnswers] = useState<DiscoveryAnswers | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionMissing, setSessionMissing] = useState(false);

  useEffect(() => {
    const loadResults = async () => {
      const supabase = getBrowserSupabaseClient();
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) {
          router.replace("/find?auth=required");
          return;
        }

        const stored = readStoredDiscoveryState();
        let resolvedAnswers =
          stored && isValidDiscoveryAnswers(stored.answers) ? stored.answers : null;

        if (!resolvedAnswers) {
          const { data, error } = await supabase
            .from("discovery_sessions")
            .select("answers,client_session_id")
            .eq("user_id", authData.session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle<SavedSession>();

          if (error) throw error;
          if (data && isValidDiscoveryAnswers(data.answers)) {
            resolvedAnswers = data.answers;
            window.localStorage.setItem(
              DISCOVERY_STORAGE_KEY,
              JSON.stringify({
                sessionId: data.client_session_id ?? undefined,
                answers: data.answers,
                step: 6,
                stage: "signup",
                locale,
              } satisfies StoredDiscoveryState),
            );
          }
        }

        if (!resolvedAnswers) {
          setSessionMissing(true);
          return;
        }

        setAnswers(resolvedAnswers);
        const response = await fetch(`/api/venues?city=${resolvedAnswers.city}`);
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
  }, [locale, router]);

  const copy =
    locale === "ar"
      ? {
          eyebrow: "أماكن تناسب جلستك 🎯",
          title: "هذي أماكن مناسبة لجلستك",
          subtitle:
            "نعرض لك الأماكن المتاحة في مدينتك ونحفظ تفضيلات جلستك. ومع اكتمال تقييمات الفروع بنرتبها لك بدقة أكبر.",
          empty: "ما لقينا أماكن منشورة في هالمنطقة حاليًا. جرّب تعديل اختياراتك.",
          missing: "ما قدرنا نرجع جلستك، بس تقدر تبدأ من آخر خطوة.",
          restart: "عدّل اختياراتي",
          directions: "افتح في الخرائط",
          spend: "متوسط الصرف",
          logout: "تسجيل الخروج",
        }
      : {
          eyebrow: "Your Focus Matches 🎯",
          title: "These places fit your session",
          subtitle:
            "We’ll show available places in your city and keep your session preferences. Ranking gets sharper as more branch ratings are added.",
          empty: "We don’t have published places in this area yet. Try changing your choices.",
          missing: "We couldn’t restore your session, but you can restart from the flow.",
          restart: "Change my choices",
          directions: "Open in Maps",
          spend: "Average spend",
          logout: "Log out",
        };

  const selectedPriorities = answers
    ? priorityChoices[locale].filter((choice) => answers.priorities.includes(choice.value))
    : [];
  const context = answers ? getSessionContext(locale, answers) : "";

  async function logout() {
    await getBrowserSupabaseClient().auth.signOut();
    router.push("/find");
  }

  return (
    <FloatingPanel>
      <div className="animate-find-step">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-semibold text-sky-800">{copy.eyebrow}</p>
          <button type="button" onClick={() => void logout()} className="find-back-button">
            {copy.logout}
          </button>
        </div>
        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {copy.title}
        </h1>
        {context ? <p className="mt-3 text-sm font-medium text-sky-900">{context}</p> : null}
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
          {!loading && sessionMissing ? (
            <p className="rounded-3xl bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {copy.missing}
            </p>
          ) : null}
          {!loading &&
            !sessionMissing &&
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
          {!loading && !sessionMissing && branches.length === 0 ? (
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

function getSessionContext(locale: "ar" | "en", answers: DiscoveryAnswers) {
  if (!answers.sessionType || !answers.city || !answers.locationChoice) return "";
  const session = sessionChoices[locale].find(
    (choice) => choice.value === answers.sessionType,
  )?.label;
  const location = locationChoices(locale, answers.city).find(
    (choice) => choice.value === answers.locationChoice,
  )?.label;
  const contextual = contextualQuestion(locale, answers.sessionType).options[
    Number(answers.contextualAnswer)
  ];

  return [session, location, contextual].filter(Boolean).join(" · ");
}
