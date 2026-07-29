import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { initSchema } from "@/lib/db";

// One-time setup endpoint: creates the tables if they don't exist yet.
// Gated by CRON_SECRET (same auth as the cron routes) rather than the site password,
// so it can be triggered with a simple curl command right after a fresh deploy.
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initSchema();
  return NextResponse.json({ ok: true });
}
