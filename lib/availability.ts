import type { AvailabilityRow } from "@/lib/db";

export type DateSummary = {
  everyoneFree: boolean;
  /** Dates sharing the best score, ascending. */
  dates: string[];
  /** Per best date: how many people marked it non-ideal / unavailable. */
  nonIdeal: number;
  unavailable: number;
};

export function hasEveryoneSubmitted(rows: AvailabilityRow[], members: readonly string[]): boolean {
  const submitted = new Set(rows.map((r) => r.person_name.toLowerCase()));
  return members.every((m) => submitted.has(m.toLowerCase()));
}

/**
 * Best dates in a month: everyone free if possible, otherwise the fewest unavailable (ideally
 * none), then the fewest non-ideal. Dates before `today` (YYYY-MM-DD) are ignored.
 */
export function summarizeBestDates(month: string, rows: AvailabilityRow[], today: string): DateSummary | null {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();

  let best: { reds: number; yellows: number; dates: string[] } | null = null;
  for (let d = 1; d <= count; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    if (date < today) continue;
    let reds = 0;
    let yellows = 0;
    for (const r of rows) {
      if (r.days[date] === "unavailable") reds++;
      else if (r.days[date] === "prefer_not") yellows++;
    }
    if (!best || reds < best.reds || (reds === best.reds && yellows < best.yellows)) {
      best = { reds, yellows, dates: [date] };
    } else if (reds === best.reds && yellows === best.yellows) {
      best.dates.push(date);
    }
  }
  if (!best) return null;
  return {
    everyoneFree: best.reds === 0 && best.yellows === 0,
    dates: best.dates,
    nonIdeal: best.yellows,
    unavailable: best.reds,
  };
}

export function formatDateList(dates: string[]): string {
  return dates
    .map((date) => {
      const [y, m, d] = date.split("-").map(Number);
      // "Thu, Dec 3" -> "Thu Dec 3" so the list's own commas stay unambiguous.
      return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "");
    })
    .join(", ");
}

function isWeekend(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 5 || day === 6;
}

/**
 * Like formatDateList, but shows at most `limit` dates and says how many were left out.
 * Fridays, Saturdays and Sundays are kept first; weekdays only fill any remaining spots. Shown in date order.
 */
export function formatDateListCapped(dates: string[], limit: number): string {
  if (dates.length <= limit) return formatDateList(dates);
  const chosen = [...dates.filter(isWeekend), ...dates.filter((d) => !isWeekend(d))].slice(0, limit).sort();
  return `${formatDateList(chosen)}, and ${dates.length - limit} more`;
}
