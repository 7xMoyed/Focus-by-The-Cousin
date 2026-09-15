"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/features/i18n/locale-provider";
import { getFindCopy } from "@/features/find/find-copy";
import type { DiscoveryAnswers } from "@/features/find/types";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type Availability = "idle" | "checking" | "available" | "taken" | "error";

const usernamePattern = /^[a-z0-9._]{3,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpGate({
  locale,
  answers,
  onBack,
  onSuccess,
}: {
  locale: Locale;
  answers: DiscoveryAnswers;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const copy = getFindCopy(locale);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [availability, setAvailability] = useState<Availability>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const normalizedUsername = username.trim().toLowerCase();
  const usernameValid = usernamePattern.test(normalizedUsername);

  useEffect(() => {
    if (!username || !usernameValid) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAvailability("checking");
      try {
        const response = await fetch(
          `/api/auth/username?username=${encodeURIComponent(normalizedUsername)}`,
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as { available?: boolean };
        setAvailability(
          response.ok && payload.available
            ? "available"
            : response.status === 200
              ? "taken"
              : "error",
        );
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setAvailability("error");
      }
    }, 450);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedUsername, username, usernameValid]);

  const formValid =
    availability === "available" && emailPattern.test(email.trim()) && password.length >= 8;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!formValid || submitting) return;
    setSubmitting(true);

    try {
      const { data, error: signUpError } = await getBrowserSupabaseClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: normalizedUsername,
            preferred_language: locale,
            discovery_answers: answers,
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (message.includes("username") || message.includes("duplicate")) {
          setAvailability("taken");
          setError(copy.taken);
        } else if (message.includes("already") || message.includes("registered")) {
          setError(copy.duplicateEmail);
        } else {
          setError(copy.signupError);
        }
        return;
      }

      if (data.user?.identities && data.user.identities.length === 0) {
        setError(copy.duplicateEmail);
        return;
      }

      onSuccess();
    } catch {
      setError(copy.signupError);
    } finally {
      setSubmitting(false);
    }
  }

  const availabilityText =
    availability === "checking"
      ? copy.checking
      : availability === "available"
        ? copy.available
        : availability === "taken"
          ? copy.taken
          : availability === "error"
            ? copy.signupError
            : "";

  return (
    <div className="animate-find-step">
      <button type="button" onClick={onBack} className="find-back-button" aria-label={copy.back}>
        <span aria-hidden="true">{locale === "ar" ? "→" : "←"}</span> {copy.back}
      </button>
      <div className="mt-5">
        <p className="text-sm font-medium text-sky-800">🔐 Focus</p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {copy.signupTitle}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
          {copy.signupDescription}
        </p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="signup-username" className="find-field-label">
            {copy.username}
          </label>
          <input
            id="signup-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""));
              setAvailability("idle");
            }}
            className="find-input"
            dir="ltr"
            inputMode="text"
            autoComplete="username"
            maxLength={20}
            placeholder="moyed.focus"
            aria-describedby="username-help"
            required
          />
          <span
            id="username-help"
            className="mt-2 flex min-h-5 items-center justify-between gap-3 text-xs text-slate-500"
          >
            <span>{username && !usernameValid ? copy.invalidUsername : copy.usernameNote}</span>
            {availabilityText ? (
              <span
                className={
                  availability === "available"
                    ? "text-emerald-700"
                    : availability === "taken"
                      ? "text-rose-700"
                      : ""
                }
              >
                {availabilityText}
              </span>
            ) : null}
          </span>
        </div>

        <div>
          <label htmlFor="signup-email" className="find-field-label">
            {copy.email}
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="find-input"
            dir="ltr"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          {email && !emailPattern.test(email.trim()) ? (
            <span className="mt-2 block text-xs text-rose-700">{copy.invalidEmail}</span>
          ) : null}
        </div>

        <div>
          <label htmlFor="signup-password" className="find-field-label">
            {copy.password}
          </label>
          <span className="relative block">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="find-input pe-20"
              dir="ltr"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 end-3 my-auto h-fit rounded-lg px-2 py-1 text-xs font-medium text-sky-900 hover:bg-sky-50"
            >
              {showPassword ? copy.hidePassword : copy.showPassword}
            </button>
          </span>
          <span
            className={`mt-2 block text-xs ${password && password.length < 8 ? "text-rose-700" : "text-slate-500"}`}
          >
            {password && password.length < 8 ? copy.invalidPassword : copy.passwordHint}
          </span>
        </div>

        {error ? (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!formValid || submitting}
          className="find-primary-button w-full disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? copy.creating : copy.createAccount}
        </button>
      </form>
    </div>
  );
}
