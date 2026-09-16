import type { SupabaseClient } from "@supabase/supabase-js";

import type { DiscoveryAnswers, FocusProfile, Priority } from "@/features/find/types";
import type { Locale } from "@/features/i18n/locale-provider";

type ProfileRow = {
  preferred_priorities: Priority[] | null;
  preferred_city: FocusProfile["preferredCity"] | null;
  preferred_session_type: FocusProfile["preferredSessionType"] | null;
  preferred_language: Locale;
  onboarding_completed_at: string | null;
};

export async function loadFocusProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<FocusProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "preferred_priorities,preferred_city,preferred_session_type,preferred_language,onboarding_completed_at",
    )
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  if (!data) return null;

  return {
    preferredPriorities: data.preferred_priorities ?? [],
    preferredCity: data.preferred_city ?? undefined,
    preferredSessionType: data.preferred_session_type ?? undefined,
    preferredLanguage: data.preferred_language,
    onboardingCompletedAt: data.onboarding_completed_at ?? undefined,
  };
}

export async function completeFocusOnboarding(
  supabase: SupabaseClient,
  userId: string,
  answers: DiscoveryAnswers,
  locale: Locale,
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_priorities: answers.priorities,
      preferred_city: answers.city,
      preferred_session_type: answers.sessionType,
      preferred_language: locale,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .is("onboarding_completed_at", null);

  if (error) throw error;
}

export async function updateFocusPreferences(
  supabase: SupabaseClient,
  userId: string,
  priorities: Priority[],
  locale: Locale,
) {
  if (priorities.length < 1 || priorities.length > 3) {
    throw new Error("Focus preferences must contain between one and three priorities.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_priorities: priorities,
      preferred_language: locale,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}
