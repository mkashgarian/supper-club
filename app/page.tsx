import Link from "next/link";
import SpinWheel from "@/components/SpinWheel";
import SubmissionsSection from "@/components/SubmissionsSection";
import { currentDisplayCycleMonth, formatMonthName, getActivePool, getSpinForCycle } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const displayMonth = currentDisplayCycleMonth();

  const [spin, activePool] = await Promise.all([getSpinForCycle(displayMonth), getActivePool()]);

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
          <SpinWheel
            pool={spin.pool_snapshot}
            winnerRestaurant={spin.winner_restaurant}
            winnerPerson={spin.winner_person}
          />
        ) : (
          <p className="opacity-60">No spin yet this month — check back on the 1st!</p>
        )}
      </section>

      <section>
        <SubmissionsSection initialSubmissions={activePool} />
      </section>
    </main>
  );
}
