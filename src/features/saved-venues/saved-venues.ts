import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/async/with-timeout";

const storageKey = "focus-saved-venues-v1";
let cachedLoad: Promise<Set<string>> | null = null;

function readLocalIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return new Set<string>(
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [],
    );
  } catch {
    window.localStorage.removeItem(storageKey);
    return new Set<string>();
  }
}

function writeLocalIds(ids: Set<string>) {
  window.localStorage.setItem(storageKey, JSON.stringify([...ids]));
  window.dispatchEvent(new CustomEvent("focus:saved-venues", { detail: [...ids] }));
}

async function loadAndMerge() {
  const localIds = readLocalIds();
  const supabase = getBrowserSupabaseClient();
  const { data: authData } = await withTimeout(supabase.auth.getSession(), 2500);
  const userId = authData.session?.user.id;
  if (!userId) return localIds;

  const { data, error } = await supabase
    .from("saved_venues" as string)
    .select("branch_id")
    .eq("user_id", userId)
    .returns<Array<{ branch_id: string }>>();
  if (error) return localIds;

  const merged = new Set([...localIds, ...(data ?? []).map((row) => row.branch_id)]);
  const missingRemote = [...localIds].filter(
    (branchId) => !(data ?? []).some((row) => row.branch_id === branchId),
  );
  if (missingRemote.length) {
    await supabase
      .from("saved_venues" as string)
      .upsert(
        missingRemote.map((branchId) => ({ user_id: userId, branch_id: branchId })) as never,
        { onConflict: "user_id,branch_id" },
      );
  }
  writeLocalIds(merged);
  return merged;
}

export function loadSavedVenueIds() {
  cachedLoad ??= loadAndMerge().catch(() => readLocalIds());
  return cachedLoad;
}

export async function setVenueSaved(branchId: string, saved: boolean) {
  const localIds = readLocalIds();
  if (saved) localIds.add(branchId);
  else localIds.delete(branchId);
  writeLocalIds(localIds);
  cachedLoad = Promise.resolve(localIds);

  const supabase = getBrowserSupabaseClient();
  const { data: authData } = await withTimeout(supabase.auth.getSession(), 2500);
  const userId = authData.session?.user.id;
  if (!userId) return;

  if (saved) {
    const { error } = await supabase
      .from("saved_venues" as string)
      .upsert({ user_id: userId, branch_id: branchId } as never, {
        onConflict: "user_id,branch_id",
      });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("saved_venues" as string)
      .delete()
      .eq("user_id", userId)
      .eq("branch_id", branchId);
    if (error) throw error;
  }
}
