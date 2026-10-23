import type { Database } from "@qsi-medicine/db";
import { account, session, user } from "@qsi-medicine/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { and, asc, count, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure, publicProcedure, router } from "../../index";
import { audit } from "./_shared";

const role = z.enum(["manager", "cashier"]);
const password = z.string().min(8, "Password must be at least 8 characters").max(128);

/** Refuse changes that would leave the pharmacy with no active manager. */
async function assertAnotherActiveManager(db: Database, exceptUserId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.role, "manager"), eq(user.active, true), ne(user.id, exceptUserId)));
  if (!row?.n) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "There must always be at least one active manager." });
  }
}

export const staffRouter = router({
  /** Used by the login page to show the one-time "create first manager" form. */
  needsSetup: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db.select({ n: count() }).from(user);
    return (row?.n ?? 0) === 0;
  }),

  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.session.user.id,
    name: ctx.session.user.name,
    role: ctx.session.user.role as "manager" | "cashier",
  })),

  list: managerProcedure.query(({ ctx }) =>
    ctx.db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt })
      .from(user)
      .orderBy(asc(user.name)),
  ),

  create: managerProcedure
    .input(z.object({ name: z.string().trim().min(1), email: z.email().trim().toLowerCase(), password, role }))
    .mutation(async ({ ctx, input }) => {
      const [exists] = await ctx.db.select({ id: user.id }).from(user).where(eq(user.email, input.email));
      if (exists) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      const id = crypto.randomUUID();
      const hash = await hashPassword(input.password);
      const now = new Date();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(user).values({ id, name: input.name, email: input.email, emailVerified: true, role: input.role, active: true, createdAt: now, updatedAt: now });
        // Same shape Better Auth writes for email/password accounts
        await tx.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash, createdAt: now, updatedAt: now });
        await audit(tx, ctx.session.user.id, "staff.created", "user", id, `Created ${input.role} account for ${input.name} (${input.email})`);
      });
      return { id };
    }),

  setRole: managerProcedure.input(z.object({ userId: z.string(), role })).mutation(async ({ ctx, input }) => {
    if (input.role !== "manager") await assertAnotherActiveManager(ctx.db, input.userId);
    await ctx.db.transaction(async (tx) => {
      const [u] = await tx.update(user).set({ role: input.role }).where(eq(user.id, input.userId)).returning({ name: user.name });
      await audit(tx, ctx.session.user.id, "staff.role_changed", "user", input.userId, `${u?.name} is now ${input.role}`);
    });
    return { ok: true };
  }),

  setActive: managerProcedure.input(z.object({ userId: z.string(), active: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.session.user.id && !input.active)
      throw new TRPCError({ code: "BAD_REQUEST", message: "You can't deactivate your own account." });
    if (!input.active) await assertAnotherActiveManager(ctx.db, input.userId);
    await ctx.db.transaction(async (tx) => {
      const [u] = await tx.update(user).set({ active: input.active }).where(eq(user.id, input.userId)).returning({ name: user.name });
      await audit(tx, ctx.session.user.id, input.active ? "staff.reactivated" : "staff.deactivated", "user", input.userId,
        `${input.active ? "Reactivated" : "Deactivated"} ${u?.name}`);
      // Sign them out everywhere immediately
      if (!input.active) await tx.delete(session).where(eq(session.userId, input.userId));
    });
    return { ok: true };
  }),

  resetPassword: managerProcedure.input(z.object({ userId: z.string(), password })).mutation(async ({ ctx, input }) => {
    const hash = await hashPassword(input.password);
    const updated = await ctx.db
      .update(account)
      .set({ password: hash })
      .where(and(eq(account.userId, input.userId), eq(account.providerId, "credential")))
      .returning({ id: account.id });
    if (!updated.length) throw new TRPCError({ code: "NOT_FOUND", message: "This user has no password login." });
    await ctx.db.delete(session).where(eq(session.userId, input.userId));
    const [u] = await ctx.db.select({ name: user.name }).from(user).where(eq(user.id, input.userId));
    await audit(ctx.db, ctx.session.user.id, "staff.password_reset", "user", input.userId, `Reset password for ${u?.name}`);
    return { ok: true };
  }),
});
