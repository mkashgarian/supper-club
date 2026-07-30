import Link from "next/link";
import { formatMonthName, getAllSpinHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const history = await getAllSpinHistory();

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Past picks</h1>
        <Link href="/" className="text-sm underline underline-offset-4 opacity-70 shrink-0">
          ← Back
        </Link>
      </div>

      {history.length === 0 ? (
        <p className="opacity-60">No spins yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {history.map((row) => (
            <li key={row.id} className="rounded-lg border border-black/10 dark:border-white/15 p-3">
              <p className="text-sm opacity-60">{formatMonthName(row.cycle_month, { withYear: true })}</p>
              <p className="font-medium">{row.winner_restaurant}</p>
              <p className="text-sm opacity-60">submitted by {row.winner_person}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
