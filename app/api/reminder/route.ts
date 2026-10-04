import { NextRequest, NextResponse } from "next/server";
import { MEMBERS } from "@/lib/members";
import {
  claimAvailabilityNudge,
  currentDisplayCycleMonth,
  formatMonthName,
  getActivePool,
  getAvailability,
  getLatestSpin,
  hasReminderBeenSent,
  markReminderSent,
  releaseAvailabilityNudge,
} from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth";
import { missingMembers } from "@/lib/availability";
import { mentionOrName, postToDiscord } from "@/lib/discord";

/**
 * How long after a spin we wait before nudging people who haven't submitted availability.
 * Meant to be 48h; the spin and this cron both fire at 17:00 UTC, so a strict 48h would miss the
 * run two days later by a few seconds and slip to day three. An hour of slack avoids that.
 */
const NUDGE_DELAY_MS = 47 * 60 * 60 * 1000;

// Daily safety-net nag: if the pool is empty, remind the group once per calendar month
// (the spin route already fires an immediate message the moment the pool empties —
// this just re-nudges anyone who missed that, so a month never goes unspun for lack of picks).
async function remindEmptyPool(): Promise<string> {
  const pool = await getActivePool();
  if (pool.length > 0) return "pool not empty";

  const cycleMonth = currentDisplayCycleMonth();
  if (await hasReminderBeenSent(cycleMonth)) return "already reminded this month";

  await postToDiscord(
    `⏰ The pool's empty — submit your restaurant pick so next month's spin has something to pick from: ${process.env.SITE_URL ?? ""}`
  );
  await markReminderSent(cycleMonth);
  return "reminded";
}

// 48 hours after a spin, once per month: name whoever still hasn't submitted availability.
async function nudgeAvailability(): Promise<string> {
  const spin = await getLatestSpin();
  if (!spin) return "no spin yet";
  if (Date.now() - new Date(spin.spun_at).getTime() < NUDGE_DELAY_MS) return "too soon after spin";
  if (spin.cycle_month < currentDisplayCycleMonth()) return "month already over";

  const missing = missingMembers(await getAvailability(spin.cycle_month), MEMBERS);
  if (missing.length === 0) return "everyone has submitted";
  if (!(await claimAvailabilityNudge(spin.cycle_month))) return "already nudged";

  try {
    await postToDiscord(
      `⏰ Still waiting on ${formatMonthName(spin.cycle_month)} availability from ${missing.map(mentionOrName).join(", ")}: ${process.env.SITE_URL ?? ""}/availability?month=${spin.cycle_month}`
    );
  } catch (err) {
    await releaseAvailabilityNudge(spin.cycle_month);
    throw err;
  }
  return "nudged";
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emptyPool = await remindEmptyPool();
  const availability = await nudgeAvailability();
  return NextResponse.json({ ok: true, emptyPool, availability });
}
