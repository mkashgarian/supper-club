import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { currentDisplayCycleMonth, getActivePool, insertSpinResult, isCycleLocked, markSubmissionWon } from "@/lib/db";
import { postToDiscord } from "@/lib/discord";
import { pickWinner } from "@/lib/spin";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cycleMonth = currentDisplayCycleMonth();

  if (await isCycleLocked(cycleMonth)) {
    return NextResponse.json({ ok: true, skipped: "already spun for this month" });
  }

  const pool = await getActivePool();
  const winner = pickWinner(pool);

  if (!winner) {
    await postToDiscord(
      `No active picks in the pool, so there's nothing to spin this month. Submit your restaurant here: ${process.env.SITE_URL ?? ""}`
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
    `🎡 This month's pick is in! Tap to watch the wheel land on it: ${process.env.SITE_URL ?? ""}`
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
