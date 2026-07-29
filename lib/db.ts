import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let cachedSql: NeonQueryFunction<false, false> | null = null;

/** Lazily constructs the Neon client so importing this module doesn't require DATABASE_URL at build time. */
function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!cachedSql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    cachedSql = neon(process.env.DATABASE_URL);
  }
  return cachedSql(strings, ...values);
}

export type Submission = {
  id: number;
  cycle_month: string;
  person_name: string;
  restaurant_name: string;
  notes: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
};

export type SpinHistoryRow = {
  id: number;
  cycle_month: string;
  winner_person: string;
  winner_restaurant: string;
  pool_snapshot: Submission[];
  was_pool_reset: boolean;
  spun_at: string;
};

export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id              SERIAL PRIMARY KEY,
      cycle_month     TEXT NOT NULL,
      person_name     TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      notes           TEXT,
      url             TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (cycle_month, person_name),
      UNIQUE (cycle_month, restaurant_name)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS spin_history (
      id                SERIAL PRIMARY KEY,
      cycle_month       TEXT NOT NULL UNIQUE,
      winner_person     TEXT NOT NULL,
      winner_restaurant TEXT NOT NULL,
      pool_snapshot     JSONB NOT NULL,
      was_pool_reset    BOOLEAN NOT NULL DEFAULT false,
      spun_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reminders_sent (
      cycle_month TEXT PRIMARY KEY,
      sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function monthString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** The month whose dinner has most recently been (or is about to be) decided. */
export function currentDisplayCycleMonth(now = new Date()): string {
  return monthString(now);
}

/** The month currently accepting submissions — always the month after the current one. */
export function openCycleMonth(now = new Date()): string {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return monthString(next);
}

/** True on the single day that's exactly 7 days before the open cycle's submission deadline (the 1st of next month). */
export function reminderDueToday(now = new Date()): boolean {
  const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const reminderDate = new Date(deadline);
  reminderDate.setDate(reminderDate.getDate() - 7);
  return (
    now.getFullYear() === reminderDate.getFullYear() &&
    now.getMonth() === reminderDate.getMonth() &&
    now.getDate() === reminderDate.getDate()
  );
}

export async function getSubmissionsForCycle(cycleMonth: string): Promise<Submission[]> {
  const rows = await sql`
    SELECT * FROM submissions WHERE cycle_month = ${cycleMonth} ORDER BY created_at ASC
  `;
  return rows as Submission[];
}

export async function getSubmissionById(id: number): Promise<Submission | null> {
  const rows = await sql`SELECT * FROM submissions WHERE id = ${id}`;
  return (rows[0] as Submission) ?? null;
}

export async function hasRestaurantWon(restaurantName: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM spin_history WHERE lower(winner_restaurant) = lower(${restaurantName}) LIMIT 1
  `;
  return rows.length > 0;
}

export async function isCycleLocked(cycleMonth: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM spin_history WHERE cycle_month = ${cycleMonth} LIMIT 1`;
  return rows.length > 0;
}

export async function createSubmission(input: {
  cycleMonth: string;
  personName: string;
  restaurantName: string;
  notes?: string;
  url?: string;
}): Promise<Submission> {
  const rows = await sql`
    INSERT INTO submissions (cycle_month, person_name, restaurant_name, notes, url)
    VALUES (${input.cycleMonth}, ${input.personName}, ${input.restaurantName}, ${input.notes ?? null}, ${input.url ?? null})
    RETURNING *
  `;
  return rows[0] as Submission;
}

export async function updateSubmission(
  id: number,
  input: { personName: string; restaurantName: string; notes?: string; url?: string }
): Promise<Submission> {
  const rows = await sql`
    UPDATE submissions
    SET person_name = ${input.personName},
        restaurant_name = ${input.restaurantName},
        notes = ${input.notes ?? null},
        url = ${input.url ?? null},
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] as Submission;
}

export async function deleteSubmission(id: number): Promise<void> {
  await sql`DELETE FROM submissions WHERE id = ${id}`;
}

export async function getSpinForCycle(cycleMonth: string): Promise<SpinHistoryRow | null> {
  const rows = await sql`SELECT * FROM spin_history WHERE cycle_month = ${cycleMonth}`;
  return (rows[0] as SpinHistoryRow) ?? null;
}

export async function getAllSpinHistory(): Promise<SpinHistoryRow[]> {
  const rows = await sql`SELECT * FROM spin_history ORDER BY cycle_month DESC`;
  return rows as SpinHistoryRow[];
}

export async function insertSpinResult(input: {
  cycleMonth: string;
  winnerPerson: string;
  winnerRestaurant: string;
  poolSnapshot: Submission[];
  wasPoolReset?: boolean;
}): Promise<SpinHistoryRow> {
  const rows = await sql`
    INSERT INTO spin_history (cycle_month, winner_person, winner_restaurant, pool_snapshot, was_pool_reset)
    VALUES (
      ${input.cycleMonth},
      ${input.winnerPerson},
      ${input.winnerRestaurant},
      ${JSON.stringify(input.poolSnapshot)}::jsonb,
      ${input.wasPoolReset ?? false}
    )
    ON CONFLICT (cycle_month) DO NOTHING
    RETURNING *
  `;
  return rows[0] as SpinHistoryRow;
}

export async function hasReminderBeenSent(cycleMonth: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM reminders_sent WHERE cycle_month = ${cycleMonth}`;
  return rows.length > 0;
}

export async function markReminderSent(cycleMonth: string): Promise<void> {
  await sql`
    INSERT INTO reminders_sent (cycle_month) VALUES (${cycleMonth})
    ON CONFLICT (cycle_month) DO NOTHING
  `;
}
