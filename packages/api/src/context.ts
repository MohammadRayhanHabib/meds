import type { Session } from "@qsi-medicine/auth";
import type { Database } from "@qsi-medicine/db";

export type Context = {
  session: Session | null;
  db: Database;
};
