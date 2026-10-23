import { customer, sale } from "@qsi-medicine/db/schema/pos";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../../index";

const input = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const customerRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ ctx, input: i }) => {
      const s = i?.search?.trim();
      return ctx.db
        .select({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
          visits: sql<number>`(select count(*) from sale s where s.customer_id = "customer"."id")`.mapWith(Number),
          spent: sql<number>`coalesce((select sum(s.total) from sale s where s.customer_id = "customer"."id"), 0)
            - coalesce((select sum(r.refund_amount) from sale_return r join sale s on s.id = r.sale_id where s.customer_id = "customer"."id"), 0)`.mapWith(Number),
        })
        .from(customer)
        .where(s ? or(ilike(customer.name, `%${s}%`), ilike(customer.phone, `%${s}%`)) : undefined)
        .orderBy(asc(customer.name))
        .limit(200);
    }),
  create: protectedProcedure.input(input).mutation(async ({ ctx, input: i }) => {
    const [row] = await ctx.db.insert(customer).values(i).returning();
    return row!;
  }),
  update: protectedProcedure
    .input(input.extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input: { id, ...rest } }) => {
      const [row] = await ctx.db.update(customer).set(rest).where(eq(customer.id, id)).returning();
      return row!;
    }),
  history: protectedProcedure.input(z.object({ customerId: z.number().int() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(sale)
      .where(eq(sale.customerId, input.customerId))
      .orderBy(desc(sale.createdAt))
      .limit(100),
  ),
});
