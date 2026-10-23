import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

/** Any signed-in, active staff member (cashier or manager). */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  if (ctx.session.user.active === false) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

/** Managers only: prices, returns, write-offs, money, reports, staff. */
export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only a manager can do this." });
  }
  return next();
});
