"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FloatingPanel } from "@/components/experience/floating-panel";
import {
  cityChoices,
  contextualQuestion,
  getFindCopy,
  locationChoices,
  priorityChoices,
  radiusChoices,
  sessionChoices,
  timeChoices,
} from "@/features/find/find-copy";
import { SignUpGate } from "@/features/find/sign-up-gate";
import type {
  City,
  DiscoveryAnswers,
  LocationChoice,
  Priority,
  RadiusChoice,
  SessionType,
  StoredDiscoveryState,
  VenueTeaser,
  VisitTime,
} from "@/features/find/types";
import { DISCOVERY_STORAGE_KEY, emptyDiscoveryAnswers } from "@/features/find/types";
import { useLocale } from "@/features/i18n/locale-provider";

type Stage = "intro" | "questions" | "matching" | "teaser" | "signup" | "success";
type Choice = { value: string; label: string; description?: string };

export function DiscoveryFlow() {
  const { locale } = useLocale();
  const copy = getFindCopy(locale);
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<DiscoveryAnswers>(emptyDiscoveryAnswers);
  const [hydrated, setHydrated] = useState(false);
  const [validation, setValidation] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "ready" | "denied">(
    "idle",
  );
  const [matchingIndex, setMatchingIndex] = useState(0);
  const [teaser, setTeaser] = useState<VenueTeaser | null>(null);

  useEffect(() => {
    let restoredAnswers: DiscoveryAnswers | undefined;
    let restoredStep = 1;
    let restoredStage: Stage = "intro";
    try {
      const stored = window.localStorage.getItem(DISCOVERY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredDiscoveryState;
        if (parsed.answers && Array.isArray(parsed.answers.priorities)) {
          restoredAnswers = parsed.answers;
          restoredStep = Math.min(6, Math.max(1, parsed.step || 1));
          restoredStage =
            parsed.stage === "signup"
              ? "signup"
              : parsed.stage === "teaser"
                ? "teaser"
                : parsed.stage === "questions"
                  ? "questions"
                  : "intro";
        }
      }
    } catch {
      window.localStorage.removeItem(DISCOVERY_STORAGE_KEY);
    }

    queueMicrotask(() => {
      if (restoredAnswers) setAnswers(restoredAnswers);
      setStep(restoredStep);
      setStage(restoredStage);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || stage === "matching" || stage === "success") return;
    const persistedStage: StoredDiscoveryState["stage"] =
      stage === "signup"
        ? "signup"
        : stage === "teaser"
          ? "teaser"
          : stage === "questions"
            ? "questions"
            : "intro";
    window.localStorage.setItem(
      DISCOVERY_STORAGE_KEY,
      JSON.stringify({ answers, step, stage: persistedStage } satisfies StoredDiscoveryState),
    );
  }, [answers, hydrated, stage, step]);

  useEffect(() => {
    if (stage !== "matching") return;
    const interval = window.setInterval(
      () => setMatchingIndex((value) => Math.min(value + 1, copy.matchingSteps.length - 1)),
      280,
    );
    const timeout = window.setTimeout(() => setStage("teaser"), 1250);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [copy.matchingSteps.length, stage]);

  useEffect(() => {
    if (!answers.city || (stage !== "matching" && stage !== "teaser")) return;
    const controller = new AbortController();
    void fetch(`/api/venues?city=${answers.city}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: { branches?: Array<Record<string, unknown>> }) => {
        const branch = payload.branches?.[0];
        if (!branch) return;
        const venue = Array.isArray(branch.venues) ? branch.venues[0] : branch.venues;
        setTeaser({
          branchId: String(branch.id),
          venueNameAr: String(
            (venue as Record<string, unknown> | undefined)?.name_ar ??
              branch.name_ar ??
              "مكان مناسب",
          ),
          venueNameEn: String(
            (venue as Record<string, unknown> | undefined)?.name_en ??
              branch.name_en ??
              "A fitting place",
          ),
          branchNameAr: String(branch.name_ar ?? ""),
          branchNameEn: String(branch.name_en ?? ""),
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [answers.city, stage]);

  function patchAnswers(patch: Partial<DiscoveryAnswers>) {
    setAnswers((current) => ({ ...current, ...patch }));
    setValidation("");
  }

  function goBack() {
    setValidation("");
    if (step > 1) setStep((value) => value - 1);
    else setStage("intro");
  }

  function currentStepValid() {
    if (step === 1) return Boolean(answers.city);
    if (step === 2) return Boolean(answers.sessionType);
    if (step === 3) return Boolean(answers.visitTime);
    if (step === 4) {
      if (answers.priorities.length) return true;
      setValidation(copy.priorityRequired);
      return false;
    }
    if (step === 5) {
      const areaReady = answers.locationChoice !== "area" || Boolean(answers.manualArea?.trim());
      if (answers.locationChoice && answers.radius && areaReady) return true;
      setValidation(copy.locationRequired);
      return false;
    }
    return Boolean(answers.contextualAnswer);
  }

  function continueFlow() {
    if (!currentStepValid()) return;
    if (step < 6) setStep((value) => value + 1);
    else {
      setMatchingIndex(0);
      setStage("matching");
    }
  }

  function selectLocation(value: LocationChoice) {
    if (value !== "near-me") {
      setLocationStatus("idle");
      patchAnswers({
        locationChoice: value,
        manualArea: value === "area" ? answers.manualArea : undefined,
      });
      return;
    }

    patchAnswers({ locationChoice: "near-me", manualArea: undefined });
    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      patchAnswers({ locationChoice: "area" });
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus("ready"),
      () => {
        setLocationStatus("denied");
        patchAnswers({ locationChoice: "area" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  if (!hydrated) {
    return (
      <FloatingPanel>
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
      </FloatingPanel>
    );
  }

  return (
    <FloatingPanel>
      {stage === "intro" ? (
        <div className="animate-find-step py-4 text-center sm:py-10">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-sky-50 text-3xl">
            🧠
          </div>
          <h1 className="mx-auto mt-7 max-w-lg text-2xl leading-relaxed font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {copy.intro}
          </h1>
          <button
            type="button"
            onClick={() => setStage("questions")}
            className="find-primary-button mt-9"
          >
            {copy.start}
          </button>
        </div>
      ) : null}

      {stage === "questions" ? (
        <QuestionScreen
          key={`${step}-${locale}`}
          locale={locale}
          step={step}
          title={getQuestionTitle(step, locale, answers)}
          hint={step === 4 ? copy.prioritiesHint : undefined}
          choices={getChoices(step, locale, answers)}
          selected={getSelected(step, answers)}
          multiselect={step === 4}
          onSelect={(value) => {
            if (step === 1)
              patchAnswers({
                city: value as City,
                locationChoice: undefined,
                manualArea: undefined,
              });
            if (step === 2)
              patchAnswers({ sessionType: value as SessionType, contextualAnswer: undefined });
            if (step === 3) patchAnswers({ visitTime: value as VisitTime });
            if (step === 4) {
              const priority = value as Priority;
              setAnswers((current) => ({
                ...current,
                priorities: current.priorities.includes(priority)
                  ? current.priorities.filter((item) => item !== priority)
                  : current.priorities.length < 3
                    ? [...current.priorities, priority]
                    : current.priorities,
              }));
              setValidation("");
            }
            if (step === 5) selectLocation(value as LocationChoice);
            if (step === 6) patchAnswers({ contextualAnswer: value });
          }}
          extra={
            step === 5 ? (
              <LocationDetails
                locale={locale}
                answers={answers}
                status={locationStatus}
                onAreaChange={(manualArea) => patchAnswers({ manualArea })}
                onRadiusChange={(radius) => patchAnswers({ radius })}
              />
            ) : undefined
          }
          validation={validation}
          onBack={goBack}
          onContinue={continueFlow}
          continueLabel={copy.continue}
          backLabel={copy.back}
          progressLabel={copy.progress(step)}
        />
      ) : null}

      {stage === "matching" ? (
        <div className="animate-find-step py-10 text-center sm:py-16" aria-live="polite">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-sky-50 text-3xl">
            ✨
          </div>
          <h1 className="mt-7 text-3xl font-semibold tracking-tight">{copy.matchingTitle}</h1>
          <p className="mt-5 text-sm text-slate-600">{copy.matchingSteps[matchingIndex]}</p>
          <div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-800 transition-[width] duration-300"
              style={{ width: `${((matchingIndex + 1) / copy.matchingSteps.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {stage === "teaser" ? (
        <div className="animate-find-step">
          <button
            type="button"
            onClick={() => {
              setStage("questions");
              setStep(6);
            }}
            className="find-back-button"
          >
            <span aria-hidden="true">{locale === "ar" ? "→" : "←"}</span> {copy.back}
          </button>
          <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {copy.teaserTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            {copy.teaserDescription}
          </p>
          <TeaserCard locale={locale} answers={answers} teaser={teaser} />
          <button
            type="button"
            onClick={() => setStage("signup")}
            className="find-primary-button mt-7 w-full"
          >
            {copy.reveal}
          </button>
        </div>
      ) : null}

      {stage === "signup" ? (
        <SignUpGate
          locale={locale}
          answers={answers}
          onBack={() => setStage("teaser")}
          onSuccess={() => {
            setStage("success");
            window.setTimeout(() => router.push("/results"), 900);
          }}
        />
      ) : null}

      {stage === "success" ? (
        <div className="animate-find-step py-14 text-center" aria-live="polite">
          <div className="text-5xl">👌</div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{copy.success}</h1>
        </div>
      ) : null}
    </FloatingPanel>
  );
}

function QuestionScreen({
  locale,
  step,
  title,
  hint,
  choices,
  selected,
  multiselect,
  extra,
  validation,
  onSelect,
  onBack,
  onContinue,
  continueLabel,
  backLabel,
  progressLabel,
}: {
  locale: "ar" | "en";
  step: number;
  title: string;
  hint?: string;
  choices: Choice[];
  selected: string[];
  multiselect?: boolean;
  extra?: React.ReactNode;
  validation: string;
  onSelect: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  continueLabel: string;
  backLabel: string;
  progressLabel: string;
}) {
  return (
    <div className="animate-find-step">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="find-back-button">
          <span aria-hidden="true">{locale === "ar" ? "→" : "←"}</span> {backLabel}
        </button>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          {progressLabel}
        </span>
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-sky-800 transition-[width] duration-300"
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>
      <h1 className="mt-7 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
      <div className={`mt-6 grid gap-3 ${step === 4 ? "sm:grid-cols-2" : ""}`}>
        {choices.map((choice) => {
          const active = selected.includes(choice.value);
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => onSelect(choice.value)}
              aria-pressed={active}
              className={`find-choice ${active ? "find-choice-selected" : ""}`}
            >
              <span className="flex-1">
                <span className="block text-base font-semibold text-slate-900">{choice.label}</span>
                {choice.description ? (
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    {choice.description}
                  </span>
                ) : null}
              </span>
              {active ? (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sky-800 text-xs text-white">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {multiselect ? <p className="mt-3 text-xs text-slate-500">{selected.length}/3</p> : null}
      {extra}
      {validation ? (
        <p role="alert" className="mt-4 text-sm text-rose-700">
          {validation}
        </p>
      ) : null}
      <button type="button" onClick={onContinue} className="find-primary-button mt-7 w-full">
        {continueLabel}
      </button>
    </div>
  );
}

function LocationDetails({
  locale,
  answers,
  status,
  onAreaChange,
  onRadiusChange,
}: {
  locale: "ar" | "en";
  answers: DiscoveryAnswers;
  status: "idle" | "requesting" | "ready" | "denied";
  onAreaChange: (value: string) => void;
  onRadiusChange: (value: RadiusChoice) => void;
}) {
  const copy = getFindCopy(locale);
  return (
    <div className="mt-7 border-t border-slate-200 pt-6">
      {status !== "idle" ? (
        <p className={`mb-4 text-sm ${status === "denied" ? "text-amber-700" : "text-slate-600"}`}>
          {status === "requesting"
            ? copy.locationRequesting
            : status === "ready"
              ? copy.locationReady
              : copy.locationDenied}
        </p>
      ) : null}
      {answers.locationChoice === "area" ? (
        <input
          value={answers.manualArea ?? ""}
          onChange={(event) => onAreaChange(event.target.value)}
          className="find-input mb-6"
          placeholder={copy.areaPlaceholder}
        />
      ) : null}
      <h2 className="text-lg font-semibold text-slate-900">{copy.radiusTitle}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {radiusChoices[locale].map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => onRadiusChange(choice.value)}
            aria-pressed={answers.radius === choice.value}
            className={`find-choice min-h-12 justify-center px-3 py-3 text-center ${answers.radius === choice.value ? "find-choice-selected" : ""}`}
          >
            <span className="text-sm font-semibold">{choice.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeaserCard({
  locale,
  answers,
  teaser,
}: {
  locale: "ar" | "en";
  answers: DiscoveryAnswers;
  teaser: VenueTeaser | null;
}) {
  const copy = getFindCopy(locale);
  const labels = priorityChoices[locale].filter((choice) =>
    answers.priorities.includes(choice.value),
  );
  const venueName = teaser
    ? locale === "ar"
      ? teaser.venueNameAr
      : teaser.venueNameEn
    : locale === "ar"
      ? "مكان مختار لك"
      : "A place picked for you";
  const branchName = teaser ? (locale === "ar" ? teaser.branchNameAr : teaser.branchNameEn) : "";
  return (
    <div className="relative mt-7 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-[0_14px_40px_rgba(14,63,86,0.09)] sm:p-6">
      <div
        className="absolute -end-5 -top-7 size-24 rounded-full bg-sky-100/60 blur-xl"
        aria-hidden="true"
      />
      <p className="relative text-sm font-semibold text-sky-800">🎯 {copy.teaserMatch}</p>
      <h2 className="relative mt-3 text-xl font-semibold text-slate-950">{venueName}</h2>
      {branchName ? <p className="relative mt-1 text-sm text-slate-500">{branchName}</p> : null}
      <div className="relative mt-4 flex flex-wrap gap-2">
        {labels.map((item) => (
          <span
            key={item.value}
            className="rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function getQuestionTitle(step: number, locale: "ar" | "en", answers: DiscoveryAnswers) {
  const copy = getFindCopy(locale);
  if (step === 1) return copy.cityTitle;
  if (step === 2) return copy.sessionTitle;
  if (step === 3) return copy.timeTitle;
  if (step === 4) return copy.prioritiesTitle;
  if (step === 5) return copy.locationTitle;
  return contextualQuestion(locale, answers.sessionType ?? "deep-focus").title;
}

function getChoices(step: number, locale: "ar" | "en", answers: DiscoveryAnswers): Choice[] {
  if (step === 1) return cityChoices[locale];
  if (step === 2) return sessionChoices[locale];
  if (step === 3) return timeChoices[locale];
  if (step === 4) return priorityChoices[locale];
  if (step === 5) return locationChoices(locale, answers.city ?? "riyadh");
  return contextualQuestion(locale, answers.sessionType ?? "deep-focus").options.map(
    (label, index) => ({ value: String(index), label }),
  );
}

function getSelected(step: number, answers: DiscoveryAnswers) {
  if (step === 1) return answers.city ? [answers.city] : [];
  if (step === 2) return answers.sessionType ? [answers.sessionType] : [];
  if (step === 3) return answers.visitTime ? [answers.visitTime] : [];
  if (step === 4) return answers.priorities;
  if (step === 5) return answers.locationChoice ? [answers.locationChoice] : [];
  return answers.contextualAnswer ? [answers.contextualAnswer] : [];
}
