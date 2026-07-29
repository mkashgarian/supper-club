import type { Submission } from "@/lib/db";

/** Pure random pick — kept separate from any DB/network code so it's trivially unit-testable. */
export function pickWinner(submissions: Submission[]): Submission | null {
  if (submissions.length === 0) return null;
  const index = Math.floor(Math.random() * submissions.length);
  return submissions[index];
}
