import { NextRequest, NextResponse } from "next/server";
import { createSubmission, getActivePool, hasRestaurantWon } from "@/lib/db";

export async function GET() {
  const submissions = await getActivePool();
  return NextResponse.json({ submissions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const personName = String(body.personName ?? "").trim();
  const restaurantName = String(body.restaurantName ?? "").trim();
  const cuisine = body.cuisine ? String(body.cuisine).trim() : undefined;
  const notes = body.notes ? String(body.notes).trim() : undefined;
  const url = body.url ? String(body.url).trim() : undefined;

  if (!personName || !restaurantName) {
    return NextResponse.json(
      { error: "Both your name and a restaurant name are required." },
      { status: 400 }
    );
  }

  if (await hasRestaurantWon(restaurantName)) {
    return NextResponse.json(
      { error: `${restaurantName} has already won a previous month and can't be picked again.` },
      { status: 409 }
    );
  }

  const existing = await getActivePool();
  const lowerPerson = personName.toLowerCase();
  const lowerRestaurant = restaurantName.toLowerCase();

  if (existing.some((s) => s.person_name.toLowerCase() === lowerPerson)) {
    return NextResponse.json(
      { error: "You already have an active pick in the pool — edit your existing submission instead." },
      { status: 409 }
    );
  }
  if (existing.some((s) => s.restaurant_name.toLowerCase() === lowerRestaurant)) {
    return NextResponse.json(
      { error: `${restaurantName} is already someone else's active pick.` },
      { status: 409 }
    );
  }

  const submission = await createSubmission({ personName, restaurantName, cuisine, notes, url });
  return NextResponse.json({ submission }, { status: 201 });
}
