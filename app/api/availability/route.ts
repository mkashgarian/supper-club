import { NextRequest, NextResponse } from "next/server";
import { MEMBERS } from "@/lib/members";
import {
  DayStatus,
  claimAvailabilityAnnouncement,
  formatMonthName,
  getAvailability,
  getSpinForCycle,
  getWinningSubmission,
  releaseAvailabilityAnnouncement,
  saveAvailability,
} from "@/lib/db";
import { buildAvailabilitySummary, hasEveryoneSubmitted, summarizeBestDates } from "@/lib/availability";
import { isClosedOn } from "@/lib/hours";
import { postToDiscord } from "@/lib/discord";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Once the last member responds, posts the best dates for the month (once per month). */
async function announceIfComplete(month: string) {
  const rows = await getAvailability(month);
  if (!hasEveryoneSubmitted(rows, MEMBERS)) return;
  if (!(await claimAvailabilityAnnouncement(month))) return;

  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    // Only consider days the month's restaurant is open (when it's been chosen and its hours are known).
    const spin = await getSpinForCycle(month);
    const winner = spin ? await getWinningSubmission(month, spin.winner_restaurant) : null;
    const hours = winner?.hours ?? null;
    const summary = summarizeBestDates(month, rows, today, hours ? (date) => !isClosedOn(hours, date) : undefined);
    const message = buildAvailabilitySummary({
      monthName: formatMonthName(month),
      memberCount: MEMBERS.length,
      summary,
      openRestaurant: hours ? winner!.restaurant_name : null,
    });
    await postToDiscord(message);
  } catch (err) {
    await releaseAvailabilityAnnouncement(month);
    throw err;
  }
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  return NextResponse.json({ availability: await getAvailability(month) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const month = String(body.month ?? "");
  const personName = String(body.personName ?? "").trim();
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  if (!(MEMBERS as readonly string[]).includes(personName)) {
    return NextResponse.json({ error: "Please pick your name." }, { status: 400 });
  }

  const days: Record<string, DayStatus> = {};
  for (const [date, status] of Object.entries(body.days ?? {})) {
    if (!date.startsWith(month + "-") || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (status === "unavailable" || status === "prefer_not") days[date] = status;
  }

  const row = await saveAvailability(month, personName, days);
  try {
    await announceIfComplete(month);
  } catch (err) {
    // The save succeeded; a Discord/DB hiccup shouldn't fail it (the next save retries the announcement).
    console.error("Availability announcement failed", err);
  }
  return NextResponse.json({ availability: row });
}
