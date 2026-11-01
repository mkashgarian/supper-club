import Link from "next/link";
import SpinWheel from "@/components/SpinWheel";
import SubmissionsSection from "@/components/SubmissionsSection";
import { currentDisplayCycleMonth, formatMonthName, getActivePool, getSpinForCycle, nextCycleMonth } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Spins happen a month ahead, so lead with the following month's pick. Fall back to the current
  // month's pick if the next one hasn't been spun yet.
  const [nextSpin, currentSpin, activePool] = await Promise.all([
    getSpinForCycle(nextCycleMonth()),
    getSpinForCycle(currentDisplayCycleMonth()),
    getActivePool(),
  ]);
  const spin = nextSpin ?? currentSpin;
  const displayMonth = spin?.cycle_month ?? nextCycleMonth();

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🍽️ Supper Club</h1>
        <div className="flex gap-4">
          <Link href="/availability" className="text-sm underline underline-offset-4 opacity-70">
            Availability
          </Link>
          <Link href="/history" className="text-sm underline underline-offset-4 opacity-70">
            History
          </Link>
        </div>
      </div>

      <section className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold">{formatMonthName(displayMonth)}&apos;s pick</h2>
        {spin ? (
          <SpinWheel
            pool={spin.pool_snapshot}
            winnerRestaurant={spin.winner_restaurant}
            winnerPerson={spin.winner_person}
          />
        ) : (
          <p className="opacity-60">No pick yet — check back after the spin on the 1st!</p>
        )}
        {currentSpin && currentSpin.cycle_month !== displayMonth && (
          <p className="text-sm opacity-60">
            This month ({formatMonthName(currentSpin.cycle_month)}): {currentSpin.winner_restaurant}
          </p>
        )}
      </section>

      <section>
        <SubmissionsSection initialSubmissions={activePool} />
      </section>
    </main>
  );
}
