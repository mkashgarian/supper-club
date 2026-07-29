import { NextRequest, NextResponse } from "next/server";
import {
  deleteSubmission,
  getSubmissionById,
  getSubmissionsForCycle,
  hasRestaurantWon,
  isCycleLocked,
  updateSubmission,
} from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const existing = await getSubmissionById(id);

  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (await isCycleLocked(existing.cycle_month)) {
    return NextResponse.json(
      { error: "This round has already been spun and is locked." },
      { status: 409 }
    );
  }

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

  if (
    restaurantName.toLowerCase() !== existing.restaurant_name.toLowerCase() &&
    (await hasRestaurantWon(restaurantName))
  ) {
    return NextResponse.json(
      { error: `${restaurantName} has already won a previous month and can't be picked again.` },
      { status: 409 }
    );
  }

  const siblings = (await getSubmissionsForCycle(existing.cycle_month)).filter((s) => s.id !== id);
  const lowerPerson = personName.toLowerCase();
  const lowerRestaurant = restaurantName.toLowerCase();

  if (siblings.some((s) => s.person_name.toLowerCase() === lowerPerson)) {
    return NextResponse.json(
      { error: "Someone else already submitted under that name this round." },
      { status: 409 }
    );
  }
  if (siblings.some((s) => s.restaurant_name.toLowerCase() === lowerRestaurant)) {
    return NextResponse.json(
      { error: `${restaurantName} has already been submitted by someone else this round.` },
      { status: 409 }
    );
  }

  const submission = await updateSubmission(id, { personName, restaurantName, notes, url });
  return NextResponse.json({ submission });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const existing = await getSubmissionById(id);

  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (await isCycleLocked(existing.cycle_month)) {
    return NextResponse.json(
      { error: "This round has already been spun and is locked." },
      { status: 409 }
    );
  }

  await deleteSubmission(id);
  return NextResponse.json({ ok: true });
}
