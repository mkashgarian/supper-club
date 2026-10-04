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

/** Members with no availability row yet, in the members' own order. */
export function missingMembers(rows: AvailabilityRow[], members: readonly string[]): string[] {
  const submitted = new Set(rows.map((r) => r.person_name.toLowerCase()));
  return members.filter((m) => !submitted.has(m.toLowerCase()));
}

/**
 * Best dates in a month: everyone free if possible, otherwise the fewest unavailable (ideally
 * none), then the fewest non-ideal. Dates before `today` (YYYY-MM-DD) are ignored,
 * as are dates where `isOpen` (when given) says the restaurant is closed.
 */
export function summarizeBestDates(
  month: string,
  rows: AvailabilityRow[],
  today: string,
  isOpen?: (date: string) => boolean
): DateSummary | null {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();

  let best: { reds: number; yellows: number; dates: string[] } | null = null;
  for (let d = 1; d <= count; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    if (date < today) continue;
    if (isOpen && !isOpen(date)) continue;
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

/** Fallback (not-everyone-free) lists get long on mostly empty calendars, so they're capped. */
export const FALLBACK_DATE_LIMIT = 5;

/**
 * The Discord post once everyone has submitted. `openRestaurant` is the restaurant's name only when
 * its hours are known and were used to filter `summary` to days it's open; otherwise leave it out.
 */
export function buildAvailabilitySummary(input: {
  monthName: string;
  memberCount: number;
  summary: DateSummary | null;
  openRestaurant?: string | null;
}): string {
  const { monthName, memberCount, summary, openRestaurant } = input;
  const intro = `✅ Everyone's submitted availability for ${monthName}`;
  const open = openRestaurant ? ` and ${openRestaurant} is open` : "";

  if (!summary) {
    return openRestaurant
      ? `${intro}, but there are no upcoming dates left when ${openRestaurant} is open. Consider picking a different place or discussing dates.`
      : `${intro}, but there are no upcoming dates left to pick from.`;
  }
  if (summary.everyoneFree) {
    return `${intro}! Dates that work for all ${memberCount} of us${open}: ${formatDateList(summary.dates)}`;
  }
  if (summary.unavailable === 0) {
    return `${intro}! No date is perfect for everyone, but these are the best options that everyone should be able to make: ${formatDateListCapped(summary.dates, FALLBACK_DATE_LIMIT)}`;
  }
  return openRestaurant
    ? `${intro}, but on every day ${openRestaurant} is open, at least one person is unavailable. Consider picking a different place or discussing dates.`
    : `${intro}, but every upcoming date has at least one person unavailable. Consider discussing dates.`;
}
