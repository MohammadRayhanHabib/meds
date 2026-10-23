/**
 * Full backup of the POS database to a compressed JSON file.
 *
 *   bun run db:backup                 → backups/qsi-backup-2026-10-05_1830.json.gz
 *   bun run db:backup -- D:\Backups   → writes into that folder
 *
 * Uses DATABASE_URL from apps/server/.env. Read-only: never modifies the database.
 */
import "varlock/auto-load";

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "pg";

import { BACKUP_TABLES, FORMAT } from "./tables";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (apps/server/.env).");

const outDir = resolve(process.argv[2] ?? join(import.meta.dir, "../../../backups"));
const client = new Client({ connectionString: url });
await client.connect();

try {
  // One consistent snapshot of every table, even if the shop is selling while we back up.
  await client.query("begin isolation level repeatable read read only");
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const t of BACKUP_TABLES) {
    const { rows } = await client.query(`select coalesce(json_agg(x order by 1), '[]'::json) as data from "${t}" x`);
    tables[t] = rows[0].data;
    counts[t] = tables[t]!.length;
  }
  await client.query("commit");

  const now = new Date();
  const stamp = now.toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).replace(" ", "_").replaceAll(":", "").slice(0, 15);
  const body = JSON.stringify({ ...FORMAT, createdAt: now.toISOString(), counts, tables });
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `qsi-backup-${stamp}.json.gz`);
  writeFileSync(file, Bun.gzipSync(new TextEncoder().encode(body)));

  console.log(`✓ Backup written: ${file}`);
  console.log(`  ${(Bun.file(file).size / 1024).toFixed(1)} KB · ` + Object.entries(counts).filter(([, n]) => n).map(([t, n]) => `${t} ${n}`).join(", "));
} finally {
  await client.end();
}
