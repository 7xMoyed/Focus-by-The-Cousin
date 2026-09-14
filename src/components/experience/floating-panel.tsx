import type { ReactNode } from "react";

export function FloatingPanel({ children }: { children: ReactNode }) {
  return (
    <section className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-panel p-7 text-panel-foreground shadow-[0_24px_90px_rgba(0,15,30,0.28)] sm:p-12">
      {children}
    </section>
  );
}
