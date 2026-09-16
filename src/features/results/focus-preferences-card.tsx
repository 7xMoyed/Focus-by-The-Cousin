"use client";

import { useState } from "react";

import { priorityChoices } from "@/features/find/find-copy";
import type { FocusProfile, Priority } from "@/features/find/types";
import type { Locale } from "@/features/i18n/locale-provider";

export function FocusPreferencesCard({
  locale,
  profile,
  onSave,
}: {
  locale: Locale;
  profile: FocusProfile;
  onSave: (priorities: Priority[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(profile.preferredPriorities);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const copy =
    locale === "ar"
      ? {
          title: "تفضيلاتك 🧠",
          edit: "عدّل تفضيلاتك",
          hint: "اختر إلى 3 أشياء تهمك غالبًا. هذي ما تغيّر فلاتر جلستك الحالية.",
          save: "حفظ التفضيلات",
          cancel: "إلغاء",
          required: "اختر شيئًا واحدًا على الأقل.",
        }
      : {
          title: "Your Focus Preferences 🧠",
          edit: "Edit preferences",
          hint: "Choose up to 3 things you usually value. This won’t change today’s filters.",
          save: "Save preferences",
          cancel: "Cancel",
          required: "Choose at least one preference.",
        };
  const choices = priorityChoices[locale];

  async function save() {
    if (!selected.length) {
      setError(copy.required);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(selected);
      setEditing(false);
    } catch {
      setError(locale === "ar" ? "ما قدرنا نحفظها الآن." : "We couldn’t save that just now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-sky-100 bg-sky-50/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-950">{copy.title}</h2>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setSelected(profile.preferredPriorities);
              setEditing(true);
            }}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-sky-900 shadow-sm"
          >
            {copy.edit}
          </button>
        ) : null}
      </div>

      {!editing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {choices
            .filter((choice) => profile.preferredPriorities.includes(choice.value))
            .map((choice) => (
              <span
                key={choice.value}
                className="rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                {choice.label}
              </span>
            ))}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs leading-6 text-slate-600">{copy.hint}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {choices.map((choice) => {
              const active = selected.includes(choice.value);
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setError("");
                    setSelected((current) => {
                      if (current.includes(choice.value)) {
                        return current.filter((item) => item !== choice.value);
                      }
                      return current.length < 3 ? [...current, choice.value] : current;
                    });
                  }}
                  className={`min-h-11 rounded-2xl border px-3 py-2 text-start text-xs font-medium transition ${
                    active
                      ? "border-sky-300 bg-white text-sky-950 shadow-sm"
                      : "border-transparent bg-white/55 text-slate-600"
                  }`}
                >
                  {choice.label} {active ? "✓" : ""}
                </button>
              );
            })}
          </div>
          {error ? <p className="mt-3 text-xs text-rose-700">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="find-primary-button min-h-11 flex-1 text-xs"
            >
              {copy.save}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-full bg-white px-4 text-xs font-semibold text-slate-600"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
