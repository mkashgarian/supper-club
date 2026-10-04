import Link from "next/link";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { getAvailability, monthString } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : monthString(new Date());
  const availability = await getAvailability(month);

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">📅 Availability</h1>
        <Link href="/" className="text-sm underline underline-offset-4 opacity-70 shrink-0">
          ← Back
        </Link>
      </div>
      <AvailabilityCalendar key={month} month={month} initialAvailability={availability} />
    </main>
  );
}
