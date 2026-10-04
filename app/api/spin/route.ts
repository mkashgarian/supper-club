import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { formatMonthName, getActivePool, insertSpinResult, isCycleLocked, markSubmissionWon, nextCycleMonth } from "@/lib/db";
import { postToDiscord } from "@/lib/discord";
import { pickWinner } from "@/lib/spin";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Spin on the 1st for the *following* month (e.g. Nov 1 decides December).
  const cycleMonth = nextCycleMonth();

  if (await isCycleLocked(cycleMonth)) {
    return NextResponse.json({ ok: true, skipped: "already spun for next month" });
  }

  const pool = await getActivePool();
  const winner = pickWinner(pool);

  if (!winner) {
    await postToDiscord(
      `No active picks in the pool, so there's nothing to spin for ${formatMonthName(cycleMonth)}. Submit your restaurant here: ${process.env.SITE_URL ?? ""}`
    );
    return NextResponse.json({ ok: true, skipped: "empty pool" });
  }

  await insertSpinResult({
    cycleMonth,
    winnerPerson: winner.person_name,
    winnerRestaurant: winner.restaurant_name,
    poolSnapshot: pool,
  });
  await markSubmissionWon(winner.id, cycleMonth);

  await postToDiscord(
    `🎡 ${formatMonthName(cycleMonth)}'s pick is in! Tap to watch the wheel land on it: ${process.env.SITE_URL ?? ""}`
  );

  await postToDiscord(
    `📅 Add your availability for ${formatMonthName(cycleMonth)} so we can lock in a date: ${process.env.SITE_URL ?? ""}/availability?month=${cycleMonth}`
  );

  // Pool just emptied — solicit the next round now instead of waiting, so there's a full
  // month of lead time before the next spin and nobody has to wait for a scheduled reminder.
  if (pool.length === 1) {
    await postToDiscord(
      `That was the last pick in the running! Submit your restaurant for the next round whenever you're ready: ${process.env.SITE_URL ?? ""}`
    );
  }

  return NextResponse.json({ ok: true, winner: winner.restaurant_name });
}
