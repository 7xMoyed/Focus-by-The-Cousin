import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export async function loadCommunityState(branchId: string, userId?: string) {
  const supabase = getBrowserSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  const countResult = await rpc.rpc("get_branch_like_count", { target_branch_id: branchId });
  let liked = false;
  if (userId) {
    const result = await supabase
      .from("venue_likes" as string)
      .select("branch_id")
      .eq("user_id", userId)
      .eq("branch_id", branchId)
      .maybeSingle<{ branch_id: string }>();
    liked = Boolean(result.data);
  }
  return {
    count: typeof countResult.data === "number" ? countResult.data : Number(countResult.data ?? 0),
    liked,
  };
}

export async function setVenueLiked(branchId: string, userId: string, liked: boolean) {
  const supabase = getBrowserSupabaseClient();
  if (liked) {
    const { error } = await supabase
      .from("venue_likes" as string)
      .upsert({ branch_id: branchId, user_id: userId } as never, { onConflict: "user_id,branch_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("venue_likes" as string)
      .delete()
      .eq("user_id", userId)
      .eq("branch_id", branchId);
    if (error) throw error;
  }
}
