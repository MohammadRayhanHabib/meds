/**
 * Restore a backup made by `bun run db:backup` into an EMPTY database.
 *
 *   1. Create a new, empty database (e.g. a new Neon branch/project).
 *   2. Point DATABASE_URL in apps/server/.env at it and run `bun run db:push`.
 *   3. bun run db:restore -- path\to\qsi-backup-....json.gz
 *
 * Refuses to run if the target already has staff accounts, so a live database
 * can never be overwritten by mistake. Everything happens in one transaction:
 * it either restores completely or not at all.
 */
import "varlock/auto-load";

import { readFileSync } from "node:fs";
import { Client } from "pg";

import { BACKUP_TABLES, FORMAT, SERIAL_TABLES } from "./tables";

const file = process.argv[2];
if (!file) {
  console.error("Usage: bun run db:restore -- <backup-file.json.gz>");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (apps/server/.env).");

const raw = file.endsWith(".gz") ? Bun.gunzipSync(readFileSync(file)) : readFileSync(file);
const backup = JSON.parse(new TextDecoder().decode(raw)) as {
  app: string; version: number; createdAt: string; counts: Record<string, number>; tables: Record<string, unknown[]>;
};
if (backup.app !== FORMAT.app || backup.version !== FORMAT.version) {
  console.error("✗ This is not a QSI Medicine POS backup (or it is from an unsupported version).");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query(`select count(*)::int as n from "user"`);
  if (rows[0].n > 0) {
    console.error(`✗ Target database already has ${rows[0].n} staff account(s). Restore only into an empty database.`);
    process.exit(1);
  }

  await client.query("begin");
  for (const t of BACKUP_TABLES) {
    const data = backup.tables[t] ?? [];
    if (!data.length) continue;
    // json_populate_recordset maps JSON keys to columns and converts types (timestamps, jsonb, …)
    await client.query(`insert into "${t}" select * from json_populate_recordset(null::"${t}", $1::json)`, [JSON.stringify(data)]);
  }
  for (const t of SERIAL_TABLES) {
    await client.query(
      `select setval(pg_get_serial_sequence('"${t}"', 'id'), coalesce((select max(id) from "${t}"), 1), (select count(*) > 0 from "${t}"))`,
    );
  }
  // verify row counts before committing
  for (const t of BACKUP_TABLES) {
    const { rows: c } = await client.query(`select count(*)::int as n from "${t}"`);
    if (c[0].n !== (backup.counts[t] ?? 0)) throw new Error(`Row count mismatch in ${t}: expected ${backup.counts[t]}, got ${c[0].n}`);
  }
  await client.query("commit");
  console.log(`✓ Restored backup from ${backup.createdAt} (${Object.values(backup.counts).reduce((a, b) => a + b, 0)} rows).`);
  console.log("  Staff sign in with their existing passwords.");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("✗ Restore failed, nothing was changed:", (e as Error).message);
  process.exit(1);
} finally {
  await client.end();
}
