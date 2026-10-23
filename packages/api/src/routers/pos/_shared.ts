import type { Database } from "@qsi-medicine/db";
import { auditLog } from "@qsi-medicine/db/schema/pos";
import { z } from "zod";

/** Money in poisha (integer). 1 taka = 100 poisha. */
export const money = z.number().int().min(0);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Today's date in Bangladesh time as YYYY-MM-DD. */
export function todayBD(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Start/end timestamps (UTC Date) for a Bangladesh-time period containing `iso`. */
export function periodRange(period: "day" | "month" | "year", iso: string) {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  // Asia/Dhaka is UTC+6, no DST.
  const bd = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm - 1, dd) - 6 * 3600_000);
  if (period === "day") return { from: bd(y, m, d), to: bd(y, m, d + 1) };
  if (period === "month") return { from: bd(y, m, 1), to: bd(y, m + 1, 1) };
  return { from: bd(y, 1, 1), to: bd(y + 1, 1, 1) };
}

// ---------------------------------------------------------------- audit trail

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Append an audit entry. Call inside the same transaction as the change so the
 * log can never disagree with the data.
 */
export async function audit(
  db: Database | Tx,
  userId: string,
  action: string,
  entity: string,
  entityId: string | number | null,
  summary: string,
  details?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({
    userId,
    action,
    entity,
    entityId: entityId == null ? null : String(entityId),
    summary,
    details,
  });
}

/** Human-readable taka for audit summaries. */
export function taka(poisha: number) {
  return `৳${(poisha / 100).toFixed(2)}`;
}
