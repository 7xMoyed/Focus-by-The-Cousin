"use client";

import Link from "next/link";

import { FloatingPanel } from "@/components/experience/floating-panel";
import { useLocale } from "@/features/i18n/locale-provider";
import { VenueEvaluations } from "@/features/reviewer/venue-evaluations";
import { RichVenueCard, type DisplayBranch } from "./rich-venue-card";

export function VenueDetail({ branch }: { branch: DisplayBranch }) {
  const { locale } = useLocale();
  return (
    <FloatingPanel>
      <div className="mx-auto max-w-3xl text-slate-950">
        <Link href="/results" className="find-back-button mb-5">
          ← {locale === "ar" ? "أماكنك" : "Your places"}
        </Link>
        <RichVenueCard branch={branch} locale={locale} detailed />
        <VenueEvaluations branchId={branch.id} />
      </div>
    </FloatingPanel>
  );
}
