import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { currentDisplayCycleMonth, getSubmissionsForCycle, insertSpinResult, isCycleLocked } from "@/lib/db";
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

  const submissions = await getSubmissionsForCycle(cycleMonth);
  const winner = pickWinner(submissions);

  if (!winner) {
    await postToDiscord(
      `No one submitted a restaurant pick for this month, so there's nothing to spin. Submissions for next month are open now: ${process.env.SITE_URL ?? ""}`
    );
    return NextResponse.json({ ok: true, skipped: "no submissions" });
  }

  await insertSpinResult({
    cycleMonth,
    winnerPerson: winner.person_name,
    winnerRestaurant: winner.restaurant_name,
    poolSnapshot: submissions,
  });

  await postToDiscord(
    `🎡 This month's pick is in! Tap to watch the wheel land on it: ${process.env.SITE_URL ?? ""}`
  );

  return NextResponse.json({ ok: true, winner: winner.restaurant_name });
}
