import { redirect } from "@tanstack/react-router";

import type { StaffRole } from "./auth-client";

type Ctx = { session: { data: { user: { role?: string | null } } | null } };

export function roleOf(ctx: Ctx): StaffRole {
  return ctx.session.data?.user.role === "manager" ? "manager" : "cashier";
}

/** Route guard: send cashiers back to the dashboard. The API enforces this too. */
export function requireManager({ context }: { context: Ctx }) {
  if (roleOf(context) !== "manager") throw redirect({ to: "/dashboard" });
}
