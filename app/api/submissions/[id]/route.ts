import { NextRequest, NextResponse } from "next/server";
import {
  deleteSubmission,
  getActivePool,
  getSubmissionById,
  hasRestaurantWon,
  updateSubmission,
} from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const existing = await getSubmissionById(id);

  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (existing.status !== "active") {
    return NextResponse.json(
      { error: "This pick has already won and can't be edited." },
      { status: 409 }
    );
  }

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

  if (
    restaurantName.toLowerCase() !== existing.restaurant_name.toLowerCase() &&
    (await hasRestaurantWon(restaurantName))
  ) {
    return NextResponse.json(
      { error: `${restaurantName} has already won a previous month and can't be picked again.` },
      { status: 409 }
    );
  }

  const siblings = (await getActivePool()).filter((s) => s.id !== id);
  const lowerPerson = personName.toLowerCase();
  const lowerRestaurant = restaurantName.toLowerCase();

  if (siblings.some((s) => s.person_name.toLowerCase() === lowerPerson)) {
    return NextResponse.json(
      { error: "Someone else already has an active pick under that name." },
      { status: 409 }
    );
  }
  if (siblings.some((s) => s.restaurant_name.toLowerCase() === lowerRestaurant)) {
    return NextResponse.json(
      { error: `${restaurantName} is already someone else's active pick.` },
      { status: 409 }
    );
  }

  const submission = await updateSubmission(id, { personName, restaurantName, cuisine, notes, url });
  return NextResponse.json({ submission });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const existing = await getSubmissionById(id);

  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (existing.status !== "active") {
    return NextResponse.json(
      { error: "This pick has already won and can't be removed." },
      { status: 409 }
    );
  }

  await deleteSubmission(id);
  return NextResponse.json({ ok: true });
}
