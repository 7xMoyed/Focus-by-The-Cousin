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
    <section className="mt-6 rounded-3xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--focus-accent-soft))] p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[hsl(var(--panel-foreground))]">
          {copy.title}
        </h2>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setSelected(profile.preferredPriorities);
              setEditing(true);
            }}
            className="focus-chip min-h-9"
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
                className="rounded-full bg-[hsl(var(--surface-raised))] px-3 py-2 text-xs font-medium text-[hsl(var(--panel-foreground))]"
              >
                {choice.label}
              </span>
            ))}
        </div>
      ) : (
        <div className="mt-4">
          <p className="focus-muted-text text-xs leading-6">{copy.hint}</p>
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
                      ? "border-[hsl(var(--focus-accent)/0.6)] bg-[hsl(var(--surface-raised))] text-[hsl(var(--focus-accent))] shadow-sm"
                      : "border-transparent bg-[hsl(var(--surface-raised)/0.6)] text-[hsl(var(--muted-foreground))]"
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
              className="focus-chip justify-center"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
