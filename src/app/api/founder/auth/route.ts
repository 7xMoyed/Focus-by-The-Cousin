import { NextRequest, NextResponse } from "next/server";
import { createFounderSession, founderSessionMaxAge } from "@/lib/founder-session";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  // FOUNDER_ACCOUNTS format: "user1:pass1,user2:pass2"
  const accounts = process.env.FOUNDER_ACCOUNTS ?? "";
  const valid = accounts.split(",").some((entry) => {
    const [u, p] = entry.split(":");
    return u === username?.trim() && p === password?.trim();
  });

  if (!valid) {
    return NextResponse.json({ error: "اليوزر أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("founder_auth", createFounderSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: founderSessionMaxAge,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("founder_auth");
  return res;
}
