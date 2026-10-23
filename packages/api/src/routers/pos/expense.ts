import { expense } from "@qsi-medicine/db/schema/pos";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, router } from "../../index";
import { audit, isoDate, money, taka } from "./_shared";

export const expenseRouter = router({
  list: managerProcedure
    .input(z.object({ from: isoDate, to: isoDate }).optional())
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(expense)
        .where(input ? and(gte(expense.expenseDate, input.from), lt(expense.expenseDate, input.to)) : undefined)
        .orderBy(desc(expense.expenseDate), desc(expense.id))
        .limit(300),
    ),
  create: managerProcedure
    .input(
      z.object({
        expenseDate: isoDate,
        category: z.string().trim().min(1),
        amount: money.refine((v) => v > 0, "Amount must be more than zero"),
        note: z.string().trim().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [row] = await tx.insert(expense).values({ ...input, createdBy: ctx.session.user.id }).returning();
        await audit(tx, ctx.session.user.id, "expense.created", "expense", row!.id,
          `${input.category} ${taka(input.amount)} on ${input.expenseDate}${input.note ? ` — ${input.note}` : ""}`);
        return row!;
      }),
    ),
  remove: managerProcedure.input(z.object({ id: z.number().int() })).mutation(({ ctx, input }) =>
    ctx.db.transaction(async (tx) => {
      const [e] = await tx.delete(expense).where(eq(expense.id, input.id)).returning();
      if (e)
        await audit(tx, ctx.session.user.id, "expense.deleted", "expense", e.id,
          `Deleted expense: ${e.category} ${taka(e.amount)} on ${e.expenseDate}`, { ...e });
      return { ok: true };
    }),
  ),
});
