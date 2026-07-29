import { NextRequest, NextResponse } from "next/server";
import {
  createSubmission,
  getSubmissionsForCycle,
  hasRestaurantWon,
  isCycleLocked,
  openCycleMonth,
} from "@/lib/db";

export async function GET() {
  const cycleMonth = openCycleMonth();
  const submissions = await getSubmissionsForCycle(cycleMonth);
  return NextResponse.json({ cycleMonth, submissions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const personName = String(body.personName ?? "").trim();
  const restaurantName = String(body.restaurantName ?? "").trim();
  const notes = body.notes ? String(body.notes).trim() : undefined;
  const url = body.url ? String(body.url).trim() : undefined;

  if (!personName || !restaurantName) {
    return NextResponse.json(
      { error: "Both your name and a restaurant name are required." },
      { status: 400 }
    );
  }

  const cycleMonth = openCycleMonth();

  if (await isCycleLocked(cycleMonth)) {
    return NextResponse.json(
      { error: "This round has already been spun and is locked." },
      { status: 409 }
    );
  }

  if (await hasRestaurantWon(restaurantName)) {
    return NextResponse.json(
      { error: `${restaurantName} has already won a previous month and can't be picked again.` },
      { status: 409 }
    );
  }

  const existing = await getSubmissionsForCycle(cycleMonth);
  const lowerPerson = personName.toLowerCase();
  const lowerRestaurant = restaurantName.toLowerCase();

  if (existing.some((s) => s.person_name.toLowerCase() === lowerPerson)) {
    return NextResponse.json(
      { error: "You've already submitted a pick this round — edit your existing submission instead." },
      { status: 409 }
    );
  }
  if (existing.some((s) => s.restaurant_name.toLowerCase() === lowerRestaurant)) {
    return NextResponse.json(
      { error: `${restaurantName} has already been submitted by someone else this round.` },
      { status: 409 }
    );
  }

  const submission = await createSubmission({ cycleMonth, personName, restaurantName, notes, url });
  return NextResponse.json({ submission }, { status: 201 });
}
