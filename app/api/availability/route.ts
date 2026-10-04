import { NextRequest, NextResponse } from "next/server";
import { MEMBERS } from "@/lib/members";
import { DayStatus, getAvailability, saveAvailability } from "@/lib/db";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  return NextResponse.json({ availability: await getAvailability(month) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const month = String(body.month ?? "");
  const personName = String(body.personName ?? "").trim();
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  if (!(MEMBERS as readonly string[]).includes(personName)) {
    return NextResponse.json({ error: "Please pick your name." }, { status: 400 });
  }

  const days: Record<string, DayStatus> = {};
  for (const [date, status] of Object.entries(body.days ?? {})) {
    if (!date.startsWith(month + "-") || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (status === "unavailable" || status === "prefer_not") days[date] = status;
  }

  const row = await saveAvailability(month, personName, days);
  return NextResponse.json({ availability: row });
}
