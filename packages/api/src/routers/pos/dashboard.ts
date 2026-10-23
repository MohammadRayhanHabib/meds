import { batch, product, sale, saleReturn } from "@qsi-medicine/db/schema/pos";
import { and, eq, gt, gte, lt, lte, sql } from "drizzle-orm";

import { protectedProcedure, router } from "../../index";
import { addDays, periodRange, todayBD } from "./_shared";
import { sellableStockSql } from "./product";

export const dashboardRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const today = todayBD();
    const { from, to } = periodRange("day", today);
    const [todaySales] = await ctx.db
      .select({
        invoices: sql<number>`count(*) filter (where ${sale.status} <> 'returned')`.mapWith(Number),
        revenue: sql<number>`coalesce(sum(${sale.total}),0)`.mapWith(Number),
      })
      .from(sale)
      .where(and(gte(sale.createdAt, from), lt(sale.createdAt, to)));
    const [refunds] = await ctx.db
      .select({ amount: sql<number>`coalesce(sum(${saleReturn.refundAmount}),0)`.mapWith(Number) })
      .from(saleReturn)
      .where(and(gte(saleReturn.createdAt, from), lt(saleReturn.createdAt, to)));

    const stock = sellableStockSql();
    const [low] = await ctx.db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(product)
      .where(and(eq(product.active, true), lte(stock, product.reorderLevel)));

    const [soon] = await ctx.db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(batch)
      .where(and(gt(batch.qtyRemaining, 0), gte(batch.expiryDate, today), lte(batch.expiryDate, addDays(today, 30))));
    const [expired] = await ctx.db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(batch)
      .where(and(gt(batch.qtyRemaining, 0), lt(batch.expiryDate, today)));

    return {
      today,
      todayRevenue: todaySales!.revenue - refunds!.amount,
      todayInvoices: todaySales!.invoices,
      lowStock: low!.n,
      expiringIn30: soon!.n,
      expiredWithStock: expired!.n,
    };
  }),
});
