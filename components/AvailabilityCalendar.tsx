"use client";

import Link from "next/link";
import { useState } from "react";
import { MEMBERS } from "@/lib/members";
import type { AvailabilityRow, DayStatus } from "@/lib/db";

type Days = Record<string, DayStatus>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const COLOR = {
  unavailable: "bg-red-500",
  prefer_not: "bg-yellow-400",
  available: "bg-green-500",
} as const;

const STATUS = {
  unavailable: { color: COLOR.unavailable, label: "Unavailable" },
  prefer_not: { color: COLOR.prefer_not, label: "Non-ideal" },
  available: { color: COLOR.available, label: "Free" },
  missing: { color: "bg-gray-300 dark:bg-gray-700", label: "Hasn't submitted" },
} as const;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Leading nulls pad the first week so day 1 lands under the right weekday. */
function buildCells(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(y, m - 1, 1).getDay();
  const count = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= count; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  return cells;
}

/** Click cycle: available -> non-ideal -> unavailable -> available. */
function nextStatus(s: DayStatus | undefined): DayStatus | undefined {
  if (!s) return "prefer_not";
  if (s === "prefer_not") return "unavailable";
  return undefined;
}

export default function AvailabilityCalendar({
  month,
  restaurant,
  initialAvailability,
}: {
  month: string;
  /** The month's chosen restaurant, if the spin has already happened. */
  restaurant?: string | null;
  initialAvailability: AvailabilityRow[];
}) {
  const [rows, setRows] = useState(initialAvailability);
  const [name, setName] = useState("");
  const [days, setDays] = useState<Days>({});
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const cells = buildCells(month);
  const [year, mon] = month.split("-").map(Number);
  const title = new Date(year, mon - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const hasSubmitted = rows.some((r) => r.person_name === name);

  function memberStatus(member: string, date: string): keyof typeof STATUS {
    const row = rows.find((r) => r.person_name === member);
    return row ? (row.days[date] ?? "available") : "missing";
  }

  function selectMember(member: string) {
    setName(member);
    setMessage(null);
    setDays(rows.find((r) => r.person_name === member)?.days ?? {});
  }

  function toggle(date: string) {
    setMessage(null);
    setDays((prev) => {
      const next = { ...prev };
      const status = nextStatus(prev[date]);
      if (status) next[date] = status;
      else delete next[date];
      return next;
    });
  }

  async function save() {
    if (!confirm(`Save this as ${name}'s availability? This replaces anything ${name} saved before.`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, personName: name, days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: data.error ?? "Couldn't save. Try again.", error: true });
        return;
      }
      const saved: AvailabilityRow = data.availability;
      setRows((prev) => [
        ...prev.filter((r) => r.person_name !== saved.person_name),
        saved,
      ]);
      setMessage({ text: "Saved!", error: false });
    } catch {
      setMessage({ text: "Couldn't save. Check your connection and try again.", error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link href={`/availability?month=${shiftMonth(month, -1)}`} className="px-2 py-1 opacity-70">
          ←
        </Link>
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={`/availability?month=${shiftMonth(month, 1)}`} className="px-2 py-1 opacity-70">
          →
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">Your availability{restaurant ? ` for ${restaurant}` : ""}</h3>
        <div className="flex flex-wrap gap-2">
          {MEMBERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => selectMember(m)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                name === m
                  ? "bg-foreground text-background border-foreground"
                  : "border-black/15 dark:border-white/20"
              }`}
            >
              {m}
              {rows.some((r) => r.person_name === m) && " ✓"}
            </button>
          ))}
        </div>
        {name ? (
          <>
            <p className="text-sm opacity-60">
              Hi {name}! Tap a day: once = non-ideal, twice = unavailable, three times = free. Everything
              else counts as free.
            </p>
            <Legend />
            <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-60">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) =>
                date ? (
                  <button
                    key={date}
                    type="button"
                    onClick={() => toggle(date)}
                    className={`aspect-square rounded-md text-sm font-medium text-white select-none ${
                      COLOR[days[date] ?? "available"]
                    } ${days[date] === "prefer_not" ? "text-black" : ""} ${days[date] ? "" : "opacity-40"}`}
                  >
                    {Number(date.slice(8))}
                  </button>
                ) : (
                  <div key={`pad-${i}`} />
                )
              )}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving || !name}
              className="rounded-lg bg-foreground text-background px-4 py-2 font-medium disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save my availability"}
            </button>
            {message && (
              <p className={`text-sm ${message.error ? "text-red-500" : "text-green-600"}`}>{message.text}</p>
            )}
          </>
        ) : (
          <p className="text-sm opacity-60">Tap your name to get started.</p>
        )}
      </section>

      {hasSubmitted ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-semibold">Everyone ({rows.length} of {MEMBERS.length} submitted)</h3>
            <p className="text-sm opacity-60">Tap a day to see everyone&apos;s answer.</p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-60">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) =>
                date ? (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDay(selectedDay === date ? null : date)}
                    className={`rounded-md border p-1 text-left ${
                      selectedDay === date
                        ? "border-foreground ring-1 ring-foreground"
                        : "border-black/10 dark:border-white/15"
                    }`}
                  >
                    <div className="text-[10px] leading-none opacity-60 mb-1">{Number(date.slice(8))}</div>
                    <div className="flex flex-wrap gap-0.5">
                      {MEMBERS.map((m) => (
                        <span key={m} className={`w-2.5 h-2.5 rounded-[2px] ${STATUS[memberStatus(m, date)].color}`} />
                      ))}
                    </div>
                  </button>
                ) : (
                  <div key={`pad-${i}`} />
                )
              )}
            </div>
            {selectedDay && (
              <div className="rounded-lg border border-black/10 dark:border-white/15 p-3 flex flex-col gap-2">
                <p className="font-medium">
                  {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {MEMBERS.map((m) => {
                    const s = STATUS[memberStatus(m, selectedDay)];
                    return (
                      <li key={m} className="flex items-center gap-2 text-sm">
                        <span className={`w-3.5 h-3.5 rounded-sm ${s.color}`} />
                        <span className="font-medium">{m}</span>
                        <span className="opacity-60">{s.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <Legend />
        </section>
      ) : (
        name && <p className="text-sm opacity-60 text-center">Save yours to see everyone&apos;s availability.</p>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
      <span className="flex items-center gap-1">
        <i className={`w-3 h-3 rounded-sm ${COLOR.unavailable}`} /> Unavailable
      </span>
      <span className="flex items-center gap-1">
        <i className={`w-3 h-3 rounded-sm ${COLOR.prefer_not}`} /> Non-ideal
      </span>
      <span className="flex items-center gap-1">
        <i className={`w-3 h-3 rounded-sm ${COLOR.available}`} /> Free
      </span>
      <span className="flex items-center gap-1">
        <i className={`w-3 h-3 rounded-sm ${STATUS.missing.color}`} /> Not submitted
      </span>
    </div>
  );
}
