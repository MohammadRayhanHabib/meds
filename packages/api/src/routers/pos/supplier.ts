import { supplier } from "@qsi-medicine/db/schema/pos";
import { asc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure, router } from "../../index";
import { audit } from "./_shared";

const input = z.object({
  name: z.string().trim().min(1),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const supplierRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ ctx, input: i }) =>
      ctx.db
        .select()
        .from(supplier)
        .where(i?.search ? ilike(supplier.name, `%${i.search}%`) : undefined)
        .orderBy(asc(supplier.name)),
    ),
  create: managerProcedure.input(input).mutation(({ ctx, input: i }) =>
    ctx.db.transaction(async (tx) => {
      const [row] = await tx.insert(supplier).values(i).returning();
      await audit(tx, ctx.session.user.id, "supplier.created", "supplier", row!.id, `Added supplier ${row!.name}`);
      return row!;
    }),
  ),
  update: managerProcedure
    .input(input.extend({ id: z.number().int(), active: z.boolean().optional() }))
    .mutation(({ ctx, input: { id, ...rest } }) =>
      ctx.db.transaction(async (tx) => {
        const [row] = await tx.update(supplier).set(rest).where(eq(supplier.id, id)).returning();
        await audit(tx, ctx.session.user.id, "supplier.updated", "supplier", id,
          `Updated supplier ${row!.name}${rest.active === false ? " (deactivated)" : ""}`, rest);
        return row!;
      }),
    ),
});
