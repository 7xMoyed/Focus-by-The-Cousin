import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const maxAgeSeconds = 60 * 60 * 24;

function sessionKey() {
  return process.env.FOUNDER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function createFounderSession() {
  const key = sessionKey();
  if (!key) throw new Error("Founder session secret is not configured");
  const expires = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `v1.${expires}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function isValidFounderSession(cookie: string | undefined) {
  const key = sessionKey();
  if (!key || !cookie) return false;
  const parts = cookie.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + maxAgeSeconds) {
    return false;
  }
  if (!/^[0-9a-f]{32}$/.test(parts[2]) || !/^[0-9a-f]{64}$/.test(parts[3])) return false;
  const payload = parts.slice(0, 3).join(".");
  const expected = Buffer.from(createHmac("sha256", key).update(payload).digest("hex"), "hex");
  const supplied = Buffer.from(parts[3], "hex");
  return timingSafeEqual(expected, supplied);
}

export const founderSessionMaxAge = maxAgeSeconds;
