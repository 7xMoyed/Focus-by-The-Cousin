import type { Metadata } from "next";

import { ExperienceShell } from "@/components/experience/experience-shell";
import { FavoritesPage } from "@/features/community/favorites-page";

export const metadata: Metadata = { title: "Favorites | مفضلاتي", robots: { index: false, follow: false } };

export default function Page() {
  return <ExperienceShell><section className="focus-surface w-full max-w-5xl rounded-[2rem] p-5 sm:p-8"><FavoritesPage /></section></ExperienceShell>;
}
