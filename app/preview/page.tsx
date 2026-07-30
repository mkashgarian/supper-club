import Link from "next/link";
import SpinWheel from "@/components/SpinWheel";
import { getSubmissionsForCycle, openCycleMonth } from "@/lib/db";
import { pickWinner } from "@/lib/spin";

export const dynamic = "force-dynamic";

const SAMPLE_POOL = [
  { restaurant_name: "Sample Sushi Spot", person_name: "Alex" },
  { restaurant_name: "Sample Taco Truck", person_name: "Jordan" },
  { restaurant_name: "Sample Pasta House", person_name: "Sam" },
  { restaurant_name: "Sample BBQ Joint", person_name: "Riley" },
  { restaurant_name: "Sample Ramen Bar", person_name: "Casey" },
];

export default async function PreviewPage() {
  const cycleMonth = openCycleMonth();
  const realSubmissions = await getSubmissionsForCycle(cycleMonth);
  const usingSampleData = realSubmissions.length === 0;
  const pool = usingSampleData ? SAMPLE_POOL : realSubmissions;
  const winner = pickWinner(pool)!;

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-6 text-center">
      <div className="w-full flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">🎲 Wheel preview</h1>
        <Link href="/" className="text-sm underline underline-offset-4 opacity-70 shrink-0">
          ← Back
        </Link>
      </div>

      <p className="text-sm opacity-60 max-w-md">
        Test spin only — nothing is saved, and this doesn&apos;t affect the real monthly pick.
        {usingSampleData && " There are no real submissions yet, so this uses sample restaurants."}
      </p>

      <SpinWheel pool={pool} winnerRestaurant={winner.restaurant_name} winnerPerson={winner.person_name} />

      <a href="/preview" className="text-sm underline underline-offset-4 opacity-70">
        Reload for a new random spin
      </a>
    </main>
  );
}
