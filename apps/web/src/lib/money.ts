/** Money is stored in poisha (integer). 1 taka = 100 poisha. */
const fmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function tk(poisha: number | null | undefined): string {
  const v = poisha ?? 0;
  return `${v < 0 ? "−" : ""}৳${fmt.format(Math.abs(v) / 100)}`;
}

/** "12.5" -> 1250. Returns NaN for invalid input. */
export function toPoisha(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[,৳\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : Number.NaN;
}

export function todayBD(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

export function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
}

export function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka",
  });
}
