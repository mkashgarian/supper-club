import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildAvailabilitySummary,
  formatDateList,
  formatDateListCapped,
  hasEveryoneSubmitted,
  missingMembers,
  summarizeBestDates,
} from "../lib/availability.ts";
import type { AvailabilityRow, DayStatus } from "../lib/db.ts";

const row = (person: string, days: Record<string, DayStatus> = {}): AvailabilityRow => ({
  month: "2026-12",
  person_name: person,
  days,
  updated_at: "",
});

describe("hasEveryoneSubmitted", () => {
  test("true only when every member has a row, ignoring case", () => {
    assert.equal(hasEveryoneSubmitted([row("allie"), row("Bob")], ["Allie", "Bob"]), true);
    assert.equal(hasEveryoneSubmitted([row("Allie")], ["Allie", "Bob"]), false);
  });

  test("a row with no marked days still counts as submitted", () => {
    assert.equal(hasEveryoneSubmitted([row("Allie", {}), row("Bob", {})], ["Allie", "Bob"]), true);
  });

  test("extra rows don't hide a missing member", () => {
    assert.equal(hasEveryoneSubmitted([row("Allie"), row("Zed")], ["Allie", "Bob"]), false);
  });
});

describe("summarizeBestDates", () => {
  test("everyone free: every date without any red or yellow", () => {
    const rows = [
      row("A", { "2026-12-01": "unavailable", "2026-12-02": "prefer_not" }),
      row("B", { "2026-12-01": "unavailable" }),
    ];
    const s = summarizeBestDates("2026-12", rows, "2026-12-01")!;
    assert.equal(s.everyoneFree, true);
    assert.equal(s.dates.length, 29);
    assert.ok(!s.dates.includes("2026-12-01"));
    assert.ok(!s.dates.includes("2026-12-02"));
  });

  test("no all-green date: picks no-red dates with the fewest yellows", () => {
    const all = Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`);
    const rows = [
      row("A", Object.fromEntries(all.map((d) => [d, "prefer_not" as const]))),
      row("B", { "2026-12-05": "prefer_not", "2026-12-06": "unavailable" }),
    ];
    const s = summarizeBestDates("2026-12", rows, "2026-12-01")!;
    assert.equal(s.everyoneFree, false);
    assert.equal(s.unavailable, 0);
    assert.equal(s.nonIdeal, 1);
    assert.ok(!s.dates.includes("2026-12-05")); // two yellows
    assert.ok(!s.dates.includes("2026-12-06")); // has a red
    assert.equal(s.dates.length, 29);
  });

  test("dates with a yellow or a red are both excluded when free dates exist", () => {
    const rows = [row("A", { "2026-12-10": "prefer_not" }), row("B", { "2026-12-11": "unavailable" })];
    const s = summarizeBestDates("2026-12", rows, "2026-12-10")!;
    assert.equal(s.everyoneFree, true);
    assert.ok(!s.dates.includes("2026-12-10"));
    assert.ok(!s.dates.includes("2026-12-11"));
  });

  test("every date has a red: falls back to the fewest unavailable", () => {
    const all = Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`);
    const rows = [
      row("A", Object.fromEntries(all.map((d) => [d, "unavailable" as const]))),
      row("B", { "2026-12-05": "unavailable" }),
    ];
    const s = summarizeBestDates("2026-12", rows, "2026-12-01")!;
    assert.equal(s.unavailable, 1);
    assert.ok(!s.dates.includes("2026-12-05"));
    assert.equal(s.dates.length, 30);
  });

  test("ignores dates before today", () => {
    const s = summarizeBestDates("2026-12", [row("A")], "2026-12-20")!;
    assert.equal(s.dates[0], "2026-12-20");
    assert.equal(s.dates.length, 12);
  });

  test("returns null when the whole month is in the past", () => {
    assert.equal(summarizeBestDates("2026-12", [row("A")], "2027-01-01"), null);
  });

  test("handles short months and leap years", () => {
    assert.equal(summarizeBestDates("2027-02", [row("A")], "2027-02-01")!.dates.length, 28);
    assert.equal(summarizeBestDates("2028-02", [row("A")], "2028-02-01")!.dates.length, 29);
  });
});

describe("date formatting", () => {
  test("formatDateList uses no comma inside a date", () => {
    assert.equal(formatDateList(["2026-12-04", "2026-12-05"]), "Fri Dec 4, Sat Dec 5");
  });

  test("formatDateListCapped leaves short lists alone", () => {
    assert.equal(formatDateListCapped(["2026-12-04", "2026-12-05"], 5), "Fri Dec 4, Sat Dec 5");
  });

  test("formatDateListCapped keeps Fri/Sat/Sun first, in date order, and counts the rest", () => {
    const all = Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`);
    assert.equal(
      formatDateListCapped(all, 5),
      "Fri Dec 4, Sat Dec 5, Sun Dec 6, Fri Dec 11, Sat Dec 12, and 26 more"
    );
  });

  test("formatDateListCapped fills with weekdays when weekend dates run out", () => {
    const dates = ["2026-12-01", "2026-12-02", "2026-12-05", "2026-12-06", "2026-12-07", "2026-12-08", "2026-12-09"];
    assert.equal(
      formatDateListCapped(dates, 5),
      "Tue Dec 1, Wed Dec 2, Sat Dec 5, Sun Dec 6, Mon Dec 7, and 2 more"
    );
  });
});

describe("missingMembers", () => {
  test("lists members without a row, in member order, ignoring case", () => {
    assert.deepEqual(missingMembers([row("bob")], ["Allie", "Bob", "Cy"]), ["Allie", "Cy"]);
  });

  test("empty once everyone has submitted", () => {
    assert.deepEqual(missingMembers([row("Allie"), row("Bob")], ["Allie", "Bob"]), []);
  });
});

describe("summarizeBestDates with opening hours", () => {
  const closedOnSundays = (date: string) => new Date(`${date}T12:00:00`).getDay() !== 0;

  test("skips days the restaurant is closed", () => {
    const s = summarizeBestDates("2026-12", [row("A")], "2026-12-01", closedOnSundays)!;
    assert.ok(!s.dates.includes("2026-12-06")); // Sunday
    assert.ok(s.dates.includes("2026-12-05"));
    assert.equal(s.dates.length, 31 - 4); // Dec 2026 has 4 Sundays
  });

  test("a red on every open day is reported even if closed days are free", () => {
    const sundays = ["2026-12-06", "2026-12-13", "2026-12-20", "2026-12-27"];
    const all = Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`);
    const rows = [row("A", Object.fromEntries(all.filter((d) => !sundays.includes(d)).map((d) => [d, "unavailable" as const])))];
    const s = summarizeBestDates("2026-12", rows, "2026-12-01", closedOnSundays)!;
    assert.equal(s.unavailable, 1);
    assert.ok(s.dates.every((d) => !sundays.includes(d)));
  });
});

describe("buildAvailabilitySummary", () => {
  const base = { monthName: "December", memberCount: 7 };

  test("everyone free, with a restaurant's hours applied", () => {
    const summary = { everyoneFree: true, dates: ["2026-12-04", "2026-12-05"], nonIdeal: 0, unavailable: 0 };
    assert.equal(
      buildAvailabilitySummary({ ...base, summary, openRestaurant: "Bar Virgil" }),
      "✅ Everyone's submitted availability for December! Dates that work for all 7 of us and Bar Virgil is open: Fri Dec 4, Sat Dec 5"
    );
  });

  test("no restaurant hours: no mention of being open", () => {
    const summary = { everyoneFree: true, dates: ["2026-12-04"], nonIdeal: 0, unavailable: 0 };
    assert.ok(!buildAvailabilitySummary({ ...base, summary }).includes("open"));
  });

  test("no conflicts but some non-ideal", () => {
    const summary = { everyoneFree: false, dates: ["2026-12-04"], nonIdeal: 1, unavailable: 0 };
    assert.equal(
      buildAvailabilitySummary({ ...base, summary, openRestaurant: "Bar Virgil" }),
      "✅ Everyone's submitted availability for December! No date is perfect for everyone, but these are the best options that everyone should be able to make: Fri Dec 4"
    );
  });

  test("conflicts on every open day suggests another place or more discussion", () => {
    const summary = { everyoneFree: false, dates: ["2026-12-04"], nonIdeal: 0, unavailable: 1 };
    const msg = buildAvailabilitySummary({ ...base, summary, openRestaurant: "Bar Virgil" });
    assert.ok(msg.includes("every day Bar Virgil is open"));
    assert.ok(msg.includes("different place or discussing dates"));
    assert.ok(!msg.includes("Dec 4"));
  });

  test("restaurant never open in the rest of the month", () => {
    assert.ok(buildAvailabilitySummary({ ...base, summary: null, openRestaurant: "Bar Virgil" }).includes("no upcoming dates left when Bar Virgil is open"));
  });
});
