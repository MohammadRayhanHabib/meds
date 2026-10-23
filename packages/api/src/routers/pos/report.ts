import { expense, product, sale, saleItem, saleReturn, saleReturnItem } from "@qsi-medicine/db/schema/pos";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, router } from "../../index";
import { isoDate, periodRange, todayBD } from "./_shared";

const period = z.enum(["day", "month", "year"]);

export const reportRouter = router({
  /**
   * Sales + Profit & Loss for a day, month or year (Bangladesh time).
   * Sales are counted on the day they happen; returns on the day they are refunded.
   * Net sales = sales (after discount) − refunds.
   * COGS = cost of items sold − cost of returned items that went back on the shelf.
   * Net profit = gross profit − expenses.
   */
  summary: managerProcedure
    .input(z.object({ period, date: isoDate.optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ?? todayBD();
      const { from, to } = periodRange(input.period, date);
      const inRange = and(gte(sale.createdAt, from), lt(sale.createdAt, to));
      const retInRange = and(gte(saleReturn.createdAt, from), lt(saleReturn.createdAt, to));

      const [totals] = await ctx.db
        .select({
          invoices: sql<number>`count(*) filter (where ${sale.status} <> 'returned')`.mapWith(Number),
          gross: sql<number>`coalesce(sum(${sale.subtotal}),0)`.mapWith(Number),
          discount: sql<number>`coalesce(sum(${sale.discount}),0)`.mapWith(Number),
          revenue: sql<number>`coalesce(sum(${sale.total}),0)`.mapWith(Number),
        })
        .from(sale)
        .where(inRange);

      const [cogs] = await ctx.db
        .select({ cost: sql<number>`coalesce(sum(${saleItem.qty} * ${saleItem.unitCost}),0)`.mapWith(Number) })
        .from(saleItem)
        .innerJoin(sale, eq(sale.id, saleItem.saleId))
        .where(inRange);

      const fromDate = new Date(from.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
      const toDate = new Date(to.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
      const [exp] = await ctx.db
        .select({ total: sql<number>`coalesce(sum(${expense.amount}),0)`.mapWith(Number) })
        .from(expense)
        .where(and(gte(expense.expenseDate, fromDate), lt(expense.expenseDate, toDate)));

      const [returned] = await ctx.db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          amount: sql<number>`coalesce(sum(${saleReturn.refundAmount}),0)`.mapWith(Number),
        })
        .from(saleReturn)
        .where(retInRange);
      const [returnedCost] = await ctx.db
        .select({ cost: sql<number>`coalesce(sum(${saleReturnItem.cost}),0)`.mapWith(Number) })
        .from(saleReturnItem)
        .innerJoin(saleReturn, eq(saleReturn.id, saleReturnItem.returnId))
        .where(and(retInRange, eq(saleReturn.restocked, true)));

      // Time series: by hour (day), by day (month), by month (year) — in Dhaka time
      const bucket =
        input.period === "day"
          ? sql`extract(hour from ${sale.createdAt} at time zone 'UTC' at time zone 'Asia/Dhaka')`
          : input.period === "month"
            ? sql`extract(day from ${sale.createdAt} at time zone 'UTC' at time zone 'Asia/Dhaka')`
            : sql`extract(month from ${sale.createdAt} at time zone 'UTC' at time zone 'Asia/Dhaka')`;
      const series = await ctx.db
        .select({
          bucket: sql<number>`${bucket}`.mapWith(Number),
          revenue: sql<number>`sum(${sale.total})`.mapWith(Number),
          invoices: sql<number>`count(*)`.mapWith(Number),
        })
        .from(sale)
        .where(inRange)
        .groupBy(bucket)
        .orderBy(bucket);

      const byMethod = await ctx.db
        .select({ method: sale.paymentMethod, amount: sql<number>`sum(${sale.total})`.mapWith(Number) })
        .from(sale)
        .where(inRange)
        .groupBy(sale.paymentMethod);

      const topProducts = await ctx.db
        .select({
          productId: product.id,
          name: product.name,
          strength: product.strength,
          qty: sql<number>`sum(${saleItem.qty} - ${saleItem.qtyReturned})`.mapWith(Number),
          revenue: sql<number>`sum((${saleItem.qty} - ${saleItem.qtyReturned}) * ${saleItem.unitPrice})`.mapWith(Number),
          profit: sql<number>`sum((${saleItem.qty} - ${saleItem.qtyReturned}) * (${saleItem.unitPrice} - ${saleItem.unitCost}))`.mapWith(Number),
        })
        .from(saleItem)
        .innerJoin(sale, eq(sale.id, saleItem.saleId))
        .innerJoin(product, eq(product.id, saleItem.productId))
        .where(inRange)
        .groupBy(product.id, product.name, product.strength)
        .orderBy(desc(sql`sum((${saleItem.qty} - ${saleItem.qtyReturned}) * ${saleItem.unitPrice})`))
        .limit(10);

      const t = totals!;
      const revenue = t.revenue - returned!.amount;
      const netCogs = cogs!.cost - returnedCost!.cost;
      const grossProfit = revenue - netCogs;
      return {
        period: input.period,
        date,
        invoices: t.invoices,
        grossSales: t.gross,
        discount: t.discount,
        refunds: returned!.amount,
        revenue,
        cogs: netCogs,
        grossProfit,
        expenses: exp!.total,
        netProfit: grossProfit - exp!.total,
        marginPct: revenue ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
        returns: returned!,
        series,
        byMethod,
        topProducts,
      };
    }),
});
