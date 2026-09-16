"use client";

import { useState } from "react";

import { useLocale } from "@/features/i18n/locale-provider";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/site";

const copy = {
  ar: {
    emailIntro: "أو راسلنا مباشرة:",
    name: "الاسم",
    email: "البريد الإلكتروني",
    subject: "الموضوع (اختياري)",
    message: "رسالتك",
    send: "أرسل الرسالة",
    sending: "جاري الإرسال…",
    success: "وصلتنا رسالتك 👌 بنرد عليك بأقرب وقت.",
    error: "ما قدرنا نرسلها الآن. تقدر تراسلنا مباشرة على البريد الموجود فوق.",
  },
  en: {
    emailIntro: "Or email us directly:",
    name: "Name",
    email: "Email",
    subject: "Subject (optional)",
    message: "Message",
    send: "Send message",
    sending: "Sending…",
    success: "Got it 👌 We’ll get back to you soon.",
    error: "We couldn’t send that right now. You can email us directly using the address above.",
  },
} as const;

export function ContactForm() {
  const { locale } = useLocale();
  const labels = copy[locale];
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });

      if (!response.ok) throw new Error("Unable to send contact message.");
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-5">
      <p className="text-sm text-slate-600">
        {labels.emailIntro}{" "}
        <a
          href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
          dir="ltr"
          className="font-semibold text-sky-900 underline decoration-sky-300 underline-offset-4"
        >
          {PUBLIC_CONTACT_EMAIL}
        </a>
      </p>

      {status === "success" ? (
        <p
          className="mt-6 rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800"
          role="status"
        >
          {labels.success}
        </p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <label className="block">
            <span className="find-field-label">{labels.name}</span>
            <input
              name="name"
              className="find-input"
              minLength={2}
              maxLength={80}
              autoComplete="name"
              required
            />
          </label>

          <label className="block">
            <span className="find-field-label">{labels.email}</span>
            <input
              name="email"
              type="email"
              dir="ltr"
              className="find-input"
              maxLength={254}
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="find-field-label">{labels.subject}</span>
            <input name="subject" className="find-input" maxLength={120} />
          </label>

          <label className="block">
            <span className="find-field-label">{labels.message}</span>
            <textarea
              name="message"
              className="find-input min-h-28 resize-y py-3"
              minLength={10}
              maxLength={2000}
              required
            />
          </label>

          {status === "error" ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
              {labels.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "sending"}
            className="find-primary-button w-full disabled:cursor-wait disabled:opacity-60"
          >
            {status === "sending" ? labels.sending : labels.send}
          </button>
        </form>
      )}
    </div>
  );
}
