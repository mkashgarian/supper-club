import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { groupHours, isClosedOn, type WeeklyHours } from "../lib/hours.ts";

const hours: WeeklyHours = {
  mon: "5pm–12am",
  tue: "5pm–12am",
  wed: "5pm–12am",
  thu: "5pm–12am",
  fri: "5pm–2am",
  sat: "5pm–2am",
  sun: null,
};

describe("isClosedOn", () => {
  test("closed on a null day, open otherwise", () => {
    assert.equal(isClosedOn(hours, "2026-12-06"), true); // Sunday
    assert.equal(isClosedOn(hours, "2026-12-04"), false); // Friday
  });

  test("a day missing from the object counts as closed", () => {
    assert.equal(isClosedOn({ tue: "11am–9pm" }, "2026-12-01"), false); // Tuesday
    assert.equal(isClosedOn({ tue: "11am–9pm" }, "2026-12-02"), true); // Wednesday
  });

  test("unknown hours never count as closed", () => {
    assert.equal(isClosedOn(null, "2026-12-06"), false);
    assert.equal(isClosedOn(undefined, "2026-12-06"), false);
  });
});

describe("groupHours", () => {
  test("merges consecutive days with the same hours, Monday first", () => {
    assert.deepEqual(groupHours(hours), [
      { days: "Mon–Thu", hours: "5pm–12am" },
      { days: "Fri–Sat", hours: "5pm–2am" },
      { days: "Sun", hours: "Closed" },
    ]);
  });

  test("shows closed days between open ones", () => {
    assert.deepEqual(groupHours({ tue: "11am–9pm", wed: "11am–9pm", fri: "11am–9pm" }), [
      { days: "Mon", hours: "Closed" },
      { days: "Tue–Wed", hours: "11am–9pm" },
      { days: "Thu", hours: "Closed" },
      { days: "Fri", hours: "11am–9pm" },
      { days: "Sat–Sun", hours: "Closed" },
    ]);
  });
});
