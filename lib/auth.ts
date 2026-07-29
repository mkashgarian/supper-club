export const SESSION_COOKIE = "supper_club_session";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic session token derived from the shared password via HMAC (Web Crypto, works in Edge middleware). */
export async function sessionToken(): Promise<string> {
  const secret = process.env.SITE_PASSWORD ?? "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("supper-club-session"));
  return toHex(sig);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.SITE_PASSWORD ?? "";
  return expected.length > 0 && candidate === expected;
}

/** Verifies the Authorization header Vercel Cron sends (also usable for manual testing). */
export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
