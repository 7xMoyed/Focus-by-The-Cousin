"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useLocale } from "@/features/i18n/locale-provider";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export type AuthIntent = { kind: "favorite" | "like" | "account"; branchId?: string };
type AuthMode = "signin" | "signup";

const pendingKey = "focus-pending-auth-action-v1";

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  openAuth: (intent?: AuthIntent, mode?: AuthMode) => void;
  signOut: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [intent, setIntent] = useState<AuthIntent>({ kind: "account" });

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setOpen(false);
        window.dispatchEvent(new Event("focus:authenticated"));
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  function openAuth(nextIntent: AuthIntent = { kind: "account" }, nextMode: AuthMode = "signin") {
    setIntent(nextIntent);
    setMode(nextMode);
    if (nextIntent.kind !== "account") {
      window.localStorage.setItem(pendingKey, JSON.stringify(nextIntent));
    }
    setOpen(true);
  }

  async function signOut() {
    await getBrowserSupabaseClient().auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext value={{ user, loading, openAuth, signOut }}>
      {children}
      {open ? (
        <AuthDialog
          locale={locale}
          mode={mode}
          intent={intent}
          onModeChange={setMode}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </AuthContext>
  );
}

function AuthDialog({
  locale,
  mode,
  intent,
  onModeChange,
  onClose,
}: {
  locale: "ar" | "en";
  mode: AuthMode;
  intent: AuthIntent;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = locale === "ar" ? authCopyAr : authCopyEn;
  const title = intent.kind === "favorite" ? copy.favoriteTitle : intent.kind === "like" ? copy.likeTitle : copy.title;
  const detail = intent.kind === "favorite" ? copy.favoriteDetail : intent.kind === "like" ? copy.likeDetail : copy.detail;

  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", close);
    };
  }, [onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const supabase = getBrowserSupabaseClient();
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { username: username.trim(), preferred_language: locale },
              emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
            },
          })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) {
      setError(locale === "ar" ? "ما ضبط الدخول. تأكد من البيانات وحاول مرة ثانية." : result.error.message);
      setBusy(false);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setError(copy.confirmEmail);
      setBusy(false);
      return;
    }
    onClose();
  }

  async function googleSignIn() {
    setBusy(true);
    setError("");
    const { error: oauthError } = await getBrowserSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (oauthError) {
      setError(copy.googleUnavailable);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-[#021824]/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-auth-title"
        className="focus-surface max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="focus-accent-text text-sm font-semibold">✨ The Cousin</p>
            <h2 id="focus-auth-title" className="mt-2 text-2xl font-semibold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="focus-icon-button" aria-label={copy.close}>✕</button>
        </div>
        <p className="focus-muted-text mt-3 text-sm leading-6">{detail}</p>

        {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" ? (
          <button type="button" disabled={busy} onClick={() => void googleSignIn()} className="focus-chip mt-6 w-full justify-center">
            G&nbsp; {copy.google}
          </button>
        ) : null}

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" ? (
            <label className="block">
              <span className="find-field-label">{copy.username}</span>
              <input className="find-input" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^A-Za-z0-9._]/g, ""))} minLength={3} maxLength={20} required autoComplete="username" dir="ltr" />
              <span className="focus-muted-text mt-1 block text-xs">{copy.usernameHint}</span>
            </label>
          ) : null}
          <label className="block">
            <span className="find-field-label">{copy.email}</span>
            <input className="find-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" dir="ltr" />
          </label>
          <label className="block">
            <span className="find-field-label">{copy.password}</span>
            <input className="find-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={mode === "signup" ? "new-password" : "current-password"} dir="ltr" />
          </label>
          {error ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">{error}</p> : null}
          <button type="submit" disabled={busy} className="find-primary-button w-full">{busy ? copy.working : mode === "signup" ? copy.join : copy.signIn}</button>
        </form>
        <button type="button" onClick={() => { setError(""); onModeChange(mode === "signin" ? "signup" : "signin"); }} className="find-back-button mt-4 w-full justify-center">
          {mode === "signin" ? copy.needAccount : copy.haveAccount}
        </button>
        <button type="button" onClick={onClose} className="find-back-button mt-1 w-full justify-center">{copy.notNow}</button>
      </section>
    </div>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function readPendingAuthIntent(): AuthIntent | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(pendingKey) ?? "null") as AuthIntent | null;
    return value?.kind ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingAuthIntent() {
  window.localStorage.removeItem(pendingKey);
}

const authCopyAr = {
  title: "حياك في Focus ☕", detail: "اكتشف الأماكن بكل حرية، وسجّل دخولك إذا ودّك تحفظ اختياراتك وتشارك المجتمع.",
  favoriteTitle: "عجبك المكان؟ 🤍", favoriteDetail: "سجّل دخولك وخله ضمن مفضلاتك، عشان ترجع له بأي وقت.",
  likeTitle: "خلّ إعجابك يوصل! ❤️", likeDetail: "سجّل دخولك وشاركنا الأماكن اللي تستاهل.", close: "إغلاق", google: "المتابعة باستخدام Google",
  username: "اسم المستخدم", usernameHint: "بالإنجليزي، من 3 إلى 20 حرف 👀", email: "البريد الإلكتروني", password: "كلمة المرور", confirmEmail: "أرسلنا لك رابط تأكيد. افتحه ثم ارجع لنفس المكان.", googleUnavailable: "Google غير مفعّل حاليًا؛ استخدم البريد الإلكتروني.", working: "لحظة...", join: "انضم لمجتمع The Cousin", signIn: "تسجيل الدخول", needAccount: "ما عندك حساب؟ انضم الآن", haveAccount: "عندك حساب؟ سجّل دخولك", notNow: "مو الحين",
};
const authCopyEn = {
  title: "Welcome to Focus ☕", detail: "Explore freely, and sign in when you want to save places and join the community.",
  favoriteTitle: "Like this place? 🤍", favoriteDetail: "Sign in to keep it in your favorites and find it anytime.",
  likeTitle: "Let your like count! ❤️", likeDetail: "Sign in and show us which places deserve it.", close: "Close", google: "Continue with Google",
  username: "Username", usernameHint: "3–20 English characters", email: "Email", password: "Password", confirmEmail: "Check your email to confirm, then return to this place.", googleUnavailable: "Google sign-in is not configured yet. Use email instead.", working: "One moment...", join: "Join The Cousin community", signIn: "Sign in", needAccount: "New here? Join now", haveAccount: "Already a member? Sign in", notNow: "Not now",
};
