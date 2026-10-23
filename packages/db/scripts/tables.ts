/**
 * Tables included in a backup, in foreign-key order (parents first).
 * Sessions and verification tokens are deliberately excluded: they are temporary
 * and restoring them would revive old logins.
 */
export const BACKUP_TABLES = [
  "user",
  "account",
  "supplier",
  "product",
  "purchase",
  "batch",
  "customer",
  "sale",
  "sale_item",
  "sale_return",
  "sale_return_item",
  "stock_adjustment",
  "expense",
  "audit_log",
] as const;

/** Tables with a serial `id` whose sequence must be moved past the restored rows. */
export const SERIAL_TABLES = BACKUP_TABLES.filter((t) => t !== "user" && t !== "account");

export const FORMAT = { app: "qsi-medicine-pos", version: 1 } as const;
