"use client";

import { useEffect, useState } from "react";

import { saveDiscoverySession } from "@/features/find/discovery-session";
import { getFindCopy } from "@/features/find/find-copy";
import type { DiscoveryAnswers } from "@/features/find/types";
import type { Locale } from "@/features/i18n/locale-provider";
import { completeFocusOnboarding } from "@/features/preferences/focus-profile";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type Availability = "idle" | "checking" | "available" | "taken" | "error";
type AuthMode = "signup" | "login";

const usernamePattern = /^[a-z0-9._]{3,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpGate({
  locale,
  answers,
  sessionId,
  onBack,
  onSuccess,
}: {
  locale: Locale;
  answers: DiscoveryAnswers;
  sessionId: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const copy = getFindCopy(locale);
  const [mode, setMode] = useState<AuthMode>("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [availability, setAvailability] = useState<Availability>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [error, setError] = useState("");
  const normalizedUsername = username.trim().toLowerCase();
  const usernameValid = usernamePattern.test(normalizedUsername);

  useEffect(() => {
    if (mode !== "signup" || !username || !usernameValid) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAvailability("checking");
      try {
        const response = await fetch(
          `/api/auth/username?username=${encodeURIComponent(normalizedUsername)}`,
          { signal: controller.signal },
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
  }, [mode, normalizedUsername, username, usernameValid]);

  const emailValid = emailPattern.test(email.trim());
  const passwordValid = mode === "signup" ? password.length >= 8 : password.length > 0;
  const formValid =
    emailValid &&
    passwordValid &&
    (mode === "login" || (usernameValid && availability === "available"));

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setShowPassword(false);
    setError("");
    setAwaitingEmail(false);
  }

  async function finishAuthentication(userId: string) {
    try {
      await saveDiscoverySession(getBrowserSupabaseClient(), userId, sessionId, answers, locale);
      await completeFocusOnboarding(getBrowserSupabaseClient(), userId, answers, locale);
      onSuccess();
    } catch {
      setError(copy.sessionSaveError);
    }
  }

  async function usernameWasClaimed() {
    try {
      const response = await fetch(
        `/api/auth/username?username=${encodeURIComponent(normalizedUsername)}`,
      );
      const payload = (await response.json()) as { available?: boolean };
      return response.ok && payload.available === false;
    } catch {
      return false;
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!formValid || submitting) return;
    setSubmitting(true);

    try {
      const supabase = getBrowserSupabaseClient();
      if (mode === "login") {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (loginError || !data.user) {
          setError(copy.wrongCredentials);
          return;
        }

        await finishAuthentication(data.user.id);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/find?auth=confirmed`,
          data: {
            username: normalizedUsername,
            preferred_language: locale,
            discovery_answers: answers,
            discovery_session_id: sessionId,
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        const usernameConflict =
          message.includes("username") ||
          message.includes("duplicate") ||
          (message.includes("database error") && (await usernameWasClaimed()));
        if (usernameConflict) {
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

      if (!data.session || !data.user) {
        setAwaitingEmail(true);
        return;
      }

      await finishAuthentication(data.user.id);
    } catch {
      setError(copy.networkError);
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

  if (awaitingEmail) {
    return (
      <div className="animate-find-step py-8 text-center" aria-live="polite">
        <div className="text-5xl">✉️</div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{copy.confirmEmailTitle}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
          {copy.confirmEmailDescription}
        </p>
        <button
          type="button"
          onClick={() => changeMode("login")}
          className="find-primary-button mt-7"
        >
          {copy.loginTab}
        </button>
      </div>
    );
  }

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
          {mode === "signup" ? copy.signupDescription : copy.loginDescription}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 rounded-full bg-slate-100 p-1" role="tablist">
        {(["signup", "login"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            onClick={() => changeMode(item)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${
              mode === item ? "bg-white text-sky-950 shadow-sm" : "text-slate-500"
            }`}
          >
            {item === "signup" ? copy.signupTab : copy.loginTab}
          </button>
        ))}
      </div>

      <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
        {mode === "signup" ? (
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
        ) : null}

        <div>
          <label htmlFor="auth-email" className="find-field-label">
            {copy.email}
          </label>
          <input
            id="auth-email"
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
          {email && !emailValid ? (
            <span className="mt-2 block text-xs text-rose-700">{copy.invalidEmail}</span>
          ) : null}
        </div>

        <div>
          <label htmlFor="auth-password" className="find-field-label">
            {copy.password}
          </label>
          <span className="relative block">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="find-input pe-20"
              dir="ltr"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : 1}
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
          {mode === "signup" ? (
            <span
              className={`mt-2 block text-xs ${password && !passwordValid ? "text-rose-700" : "text-slate-500"}`}
            >
              {password && !passwordValid ? copy.invalidPassword : copy.passwordHint}
            </span>
          ) : null}
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
          {submitting
            ? mode === "signup"
              ? copy.creating
              : copy.loggingIn
            : mode === "signup"
              ? copy.createAccount
              : copy.login}
        </button>
      </form>
    </div>
  );
}
