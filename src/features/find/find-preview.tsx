"use client";

import Link from "next/link";

import { FloatingPanel } from "@/components/experience/floating-panel";
import { useLocale } from "@/features/i18n/locale-provider";
import { messages } from "@/features/i18n/messages";

export function FindPreview() {
  const { locale } = useLocale();
  const copy = messages[locale];

  return (
    <FloatingPanel>
      <p className="text-sm font-medium text-sky-800">✨ {copy.previewEyebrow}</p>
      <h1 className="mt-5 text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
        {copy.previewTitle}
      </h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
        {copy.previewDescription}
      </p>
      <div className="mt-8 rounded-2xl bg-panel-muted px-5 py-4 text-sm text-slate-600">
        🧠 {copy.previewStatus}
      </div>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-ink px-7 text-sm font-medium text-white transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      >
        {copy.backHome}
      </Link>
    </FloatingPanel>
  );
}
