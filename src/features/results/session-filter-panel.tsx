"use client";

import { useState } from "react";

import {
  locationChoices,
  priorityChoices,
  radiusChoices,
  sessionChoices,
} from "@/features/find/find-copy";
import type {
  City,
  LocationChoice,
  Priority,
  RadiusChoice,
  SessionFilters,
  SessionType,
} from "@/features/find/types";
import type { Locale } from "@/features/i18n/locale-provider";

export function SessionFilterPanel({
  locale,
  city,
  initialFilters,
  open,
  onClose,
  onApply,
}: {
  locale: Locale;
  city: City;
  initialFilters: SessionFilters;
  open: boolean;
  onClose: () => void;
  onApply: (filters: SessionFilters) => void;
}) {
  const [filters, setFilters] = useState<SessionFilters>({ ...initialFilters, city });
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "ready" | "denied">(
    "idle",
  );
  const copy =
    locale === "ar"
      ? {
          title: "وش تحتاج اليوم؟ 🎯",
          subtitle: "هذي الفلاتر لهالجلسة بس، وما تغيّر تفضيلاتك.",
          session: "نوع الجلسة",
          priorities: "الأهم لك الآن",
          location: "المنطقة",
          distance: "المسافة",
          apply: "عرض النتائج",
          close: "إغلاق",
          area: "اكتب الحي",
          denied: "ما قدرنا نوصل لموقعك، اختر حي يدويًا 👀",
        }
      : {
          title: "What do you need today? 🎯",
          subtitle: "These filters are only for this session and won’t change your preferences.",
          session: "Session",
          priorities: "Top priorities now",
          location: "Location",
          distance: "Distance",
          apply: "Show results",
          close: "Close",
          area: "Type a neighborhood",
          denied: "We couldn’t access your location. Choose an area instead 👀",
        };

  if (!open) return null;

  function togglePriority(priority: Priority) {
    setFilters((current) => {
      if (current.priorities.includes(priority)) {
        return { ...current, priorities: current.priorities.filter((item) => item !== priority) };
      }
      if (current.priorities.length >= 3) return current;
      return { ...current, priorities: [...current.priorities, priority] };
    });
  }

  function selectLocation(locationChoice: LocationChoice) {
    if (locationChoice !== "near-me") {
      setLocationStatus("idle");
      setFilters((current) => ({
        ...current,
        locationChoice,
        manualArea: locationChoice === "area" ? current.manualArea : undefined,
      }));
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      setFilters((current) => ({ ...current, locationChoice: "area" }));
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus("ready");
        setFilters((current) => ({ ...current, locationChoice: "near-me", manualArea: undefined }));
      },
      () => {
        setLocationStatus("denied");
        setFilters((current) => ({ ...current, locationChoice: "area" }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  const canApply = Boolean(
    filters.sessionType || filters.priorities.length || filters.locationChoice || filters.radius,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label={copy.close}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-filter-title"
        className="relative max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="session-filter-title" className="text-2xl font-semibold text-slate-950">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"
            aria-label={copy.close}
          >
            ×
          </button>
        </div>

        <FilterGroup title={copy.session}>
          {sessionChoices[locale].map((choice) => (
            <FilterChip
              key={choice.value}
              active={filters.sessionType === choice.value}
              label={choice.label}
              onClick={() =>
                setFilters((current) => ({ ...current, sessionType: choice.value as SessionType }))
              }
            />
          ))}
        </FilterGroup>

        <FilterGroup title={`${copy.priorities} · ${filters.priorities.length}/3`}>
          {priorityChoices[locale].slice(0, 8).map((choice) => (
            <FilterChip
              key={choice.value}
              active={filters.priorities.includes(choice.value)}
              label={choice.label}
              onClick={() => togglePriority(choice.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title={copy.location}>
          {locationChoices(locale, city).map((choice) => (
            <FilterChip
              key={choice.value}
              active={filters.locationChoice === choice.value}
              label={choice.label}
              onClick={() => selectLocation(choice.value)}
            />
          ))}
        </FilterGroup>
        {locationStatus === "denied" ? (
          <p className="mt-3 text-xs text-amber-700">{copy.denied}</p>
        ) : null}
        {filters.locationChoice === "area" ? (
          <input
            className="find-input mt-3"
            value={filters.manualArea ?? ""}
            onChange={(event) =>
              setFilters((current) => ({ ...current, manualArea: event.target.value }))
            }
            placeholder={copy.area}
            maxLength={120}
          />
        ) : null}

        <FilterGroup title={copy.distance}>
          {radiusChoices[locale].map((choice) => (
            <FilterChip
              key={choice.value}
              active={filters.radius === choice.value}
              label={choice.label}
              onClick={() =>
                setFilters((current) => ({ ...current, radius: choice.value as RadiusChoice }))
              }
            />
          ))}
        </FilterGroup>

        <button
          type="button"
          disabled={!canApply || (filters.locationChoice === "area" && !filters.manualArea?.trim())}
          onClick={() => onApply({ ...filters, city })}
          className="find-primary-button mt-7 w-full disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copy.apply}
        </button>
      </section>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
        active
          ? "border-sky-300 bg-sky-50 text-sky-950 shadow-sm"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {label} {active ? "✓" : ""}
    </button>
  );
}
