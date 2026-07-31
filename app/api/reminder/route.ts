import { NextRequest, NextResponse } from "next/server";
import { currentDisplayCycleMonth, getActivePool, hasReminderBeenSent, markReminderSent } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth";
import { postToDiscord } from "@/lib/discord";

// Daily safety-net nag: if the pool is empty, remind the group once per calendar month
// (the spin route already fires an immediate message the moment the pool empties —
// this just re-nudges anyone who missed that, so a month never goes unspun for lack of picks).
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = await getActivePool();
  if (pool.length > 0) {
    return NextResponse.json({ ok: true, skipped: "pool not empty" });
  }

  const cycleMonth = currentDisplayCycleMonth();

  if (await hasReminderBeenSent(cycleMonth)) {
    return NextResponse.json({ ok: true, skipped: "already reminded this month" });
  }

  await postToDiscord(
    `⏰ The pool's empty — submit your restaurant pick so next month's spin has something to pick from: ${process.env.SITE_URL ?? ""}`
  );
  await markReminderSent(cycleMonth);

  return NextResponse.json({ ok: true, cycleMonth });
}
