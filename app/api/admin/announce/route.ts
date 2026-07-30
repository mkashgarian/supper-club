import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { postToDiscord } from "@/lib/discord";

// Manual one-off Discord post, gated by CRON_SECRET, for ad-hoc announcements
// (e.g. "the app is live, go submit your pick") outside the automated spin/reminder messages.
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  await postToDiscord(message);
  return NextResponse.json({ ok: true });
}
