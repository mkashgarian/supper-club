import Link from "next/link";
import SpinWheel from "@/components/SpinWheel";
import SubmissionsSection from "@/components/SubmissionsSection";
import {
  currentDisplayCycleMonth,
  formatMonthName,
  getSpinForCycle,
  getSubmissionsForCycle,
  openCycleMonth,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const displayMonth = currentDisplayCycleMonth();
  const submitMonth = openCycleMonth();

  const [spin, submissions] = await Promise.all([
    getSpinForCycle(displayMonth),
    getSubmissionsForCycle(submitMonth),
  ]);

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🍽️ Supper Club</h1>
        <Link href="/history" className="text-sm underline underline-offset-4 opacity-70">
          History
        </Link>
      </div>

      <section className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold">{formatMonthName(displayMonth)}&apos;s pick</h2>
        {spin ? (
          <>
            <SpinWheel pool={spin.pool_snapshot} winnerRestaurant={spin.winner_restaurant} />
            <p>
              🎉 <span className="font-semibold">{spin.winner_restaurant}</span>, submitted by{" "}
              {spin.winner_person}
            </p>
          </>
        ) : (
          <p className="opacity-60">No spin yet this month — check back on the 1st!</p>
        )}
        <Link href="/preview" className="text-sm underline underline-offset-4 opacity-70">
          🎲 Preview a test spin
        </Link>
      </section>

      <section>
        <SubmissionsSection cycleMonth={formatMonthName(submitMonth)} initialSubmissions={submissions} />
      </section>
    </main>
  );
}
