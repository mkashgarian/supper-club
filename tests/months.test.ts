import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatMonthName, monthString, nextCycleMonth } from "../lib/db.ts";
import { pickWinner } from "../lib/spin.ts";

describe("nextCycleMonth", () => {
  test("is the following month", () => {
    assert.equal(nextCycleMonth(new Date(2026, 10, 1)), "2026-12"); // Nov 1 -> December
  });

  test("rolls over the year boundary", () => {
    assert.equal(nextCycleMonth(new Date(2026, 11, 1)), "2027-01");
  });

  test("handles the end of a long month", () => {
    assert.equal(nextCycleMonth(new Date(2026, 0, 31)), "2026-02");
    assert.equal(nextCycleMonth(new Date(2026, 7, 31)), "2026-09");
  });
});

describe("monthString / formatMonthName", () => {
  test("zero-pads single-digit months", () => {
    assert.equal(monthString(new Date(2026, 2, 9)), "2026-03");
  });

  test("formats names with and without the year", () => {
    assert.equal(formatMonthName("2026-12"), "December");
    assert.equal(formatMonthName("2027-01", { withYear: true }), "January 2027");
  });
});

describe("pickWinner", () => {
  test("returns null for an empty pool", () => {
    assert.equal(pickWinner([]), null);
  });

  test("only ever returns a member of the pool", () => {
    const pool = ["a", "b", "c"];
    for (let i = 0; i < 100; i++) assert.ok(pool.includes(pickWinner(pool)!));
  });

  test("the only entry always wins", () => {
    assert.equal(pickWinner(["solo"]), "solo");
  });
});
