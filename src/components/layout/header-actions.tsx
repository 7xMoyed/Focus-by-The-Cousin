"use client";

import { useEffect, useState } from "react";

import { ContactForm } from "@/features/contact/contact-form";
import { useLocale } from "@/features/i18n/locale-provider";
import { messages } from "@/features/i18n/messages";

type OpenPanel = "about" | "contact" | null;

export function HeaderActions() {
  const { locale } = useLocale();
  const copy = messages[locale];
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  useEffect(() => {
    if (!openPanel) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openPanel]);

  const title = openPanel === "about" ? copy.aboutTitle : copy.contactTitle;
  const description = openPanel === "about" ? copy.aboutDescription : copy.contactDescription;

  return (
    <>
      <div
        className="flex items-center gap-1.5"
        aria-label={locale === "ar" ? "روابط سريعة" : "Quick links"}
      >
        <button type="button" onClick={() => setOpenPanel("about")} className="header-action-pill">
          {copy.aboutFocus}
        </button>
        <button
          type="button"
          onClick={() => setOpenPanel("contact")}
          className="header-action-pill"
        >
          {copy.contact}
        </button>
      </div>

      {openPanel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#021824]/58 px-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpenPanel(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-dialog-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white p-7 text-slate-950 shadow-[0_28px_90px_rgba(0,20,35,0.4)] sm:p-9"
          >
            <p className="text-sm font-medium text-[#8a742d]">
              {openPanel === "about" ? "✨ Focus by The Cousin" : "💬 Focus"}
            </p>
            <h2 id="header-dialog-title" className="mt-3 text-3xl leading-tight font-semibold">
              {title}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
            {openPanel === "contact" ? <ContactForm /> : null}
            <button
              type="button"
              onClick={() => setOpenPanel(null)}
              className="mt-7 min-h-11 cursor-pointer rounded-full bg-[#07364b] px-6 text-sm font-medium text-white transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07364b]"
            >
              {copy.close}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
