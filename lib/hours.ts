export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Weekly opening hours: a day maps to its hours text ("5pm–12am"), or null/absent when closed. */
export type WeeklyHours = Partial<Record<DayKey, string | null>>;

const DAY_NAMES: Record<DayKey, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

/** True if the restaurant is closed on this date ("YYYY-MM-DD"). Unknown hours never count as closed. */
export function isClosedOn(hours: WeeklyHours | null | undefined, date: string): boolean {
  if (!hours) return false;
  const [y, m, d] = date.split("-").map(Number);
  return !hours[DAY_KEYS[new Date(y, m - 1, d).getDay()]];
}

/** Runs of consecutive days (Mon-first) that share the same hours, e.g. "Tue–Thu" -> "11:30am–9:30pm". */
export function groupHours(hours: WeeklyHours): { days: string; hours: string }[] {
  const order: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const groups: { first: DayKey; last: DayKey; hours: string }[] = [];
  for (const key of order) {
    const value = hours[key] || "Closed";
    const prev = groups[groups.length - 1];
    if (prev && prev.hours === value) prev.last = key;
    else groups.push({ first: key, last: key, hours: value });
  }
  return groups.map((g) => ({
    days: g.first === g.last ? DAY_NAMES[g.first] : `${DAY_NAMES[g.first]}–${DAY_NAMES[g.last]}`,
    hours: g.hours,
  }));
}
