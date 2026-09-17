"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/founder/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const next = params.get("next") ?? "/founder";
      window.location.href = next;
    } else {
      const data = await res.json();
      setError(data.error ?? "خطأ غير متوقع");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground text-center mb-1">
          Focus by The Cousin
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-8">
          منطقة خاصة
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="اليوزر"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-right"
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-right"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-foreground text-background rounded-xl py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {loading ? "..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function FounderLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
