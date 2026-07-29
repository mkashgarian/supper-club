import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { hasReminderBeenSent, markReminderSent, openCycleMonth, reminderDueToday } from "@/lib/db";
import { postToDiscord } from "@/lib/discord";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!reminderDueToday()) {
    return NextResponse.json({ ok: true, skipped: "not due today" });
  }

  const cycleMonth = openCycleMonth();

  if (await hasReminderBeenSent(cycleMonth)) {
    return NextResponse.json({ ok: true, skipped: "already sent" });
  }

  await postToDiscord(
    `⏰ One week left to submit your restaurant pick for next month: ${process.env.SITE_URL ?? ""}`
  );
  await markReminderSent(cycleMonth);

  return NextResponse.json({ ok: true, cycleMonth });
}
