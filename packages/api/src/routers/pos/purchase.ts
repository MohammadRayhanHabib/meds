import { batch, product, purchase, supplier } from "@qsi-medicine/db/schema/pos";
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure, router } from "../../index";
import { audit, isoDate, money, taka, todayBD } from "./_shared";

export const purchaseRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: purchase.id,
        invoiceNo: purchase.invoiceNo,
        purchaseDate: purchase.purchaseDate,
        total: purchase.total,
        paid: purchase.paid,
        supplierName: supplier.name,
      })
      .from(purchase)
      .innerJoin(supplier, eq(supplier.id, purchase.supplierId))
      .orderBy(desc(purchase.purchaseDate), desc(purchase.id))
      .limit(200),
  ),

  get: protectedProcedure.input(z.object({ id: z.number().int() })).query(async ({ ctx, input }) => {
    const [head] = await ctx.db
      .select({ purchase, supplierName: supplier.name })
      .from(purchase)
      .innerJoin(supplier, eq(supplier.id, purchase.supplierId))
      .where(eq(purchase.id, input.id));
    if (!head) throw new TRPCError({ code: "NOT_FOUND" });
    const items = await ctx.db
      .select({ batch, productName: product.name, strength: product.strength })
      .from(batch)
      .innerJoin(product, eq(product.id, batch.productId))
      .where(eq(batch.purchaseId, input.id));
    return { ...head, items };
  }),

  /** Receive stock: one purchase, one new batch per line. */
  create: protectedProcedure
    .input(
      z.object({
        supplierId: z.number().int(),
        invoiceNo: z.string().trim().optional(),
        purchaseDate: isoDate,
        paid: money.default(0),
        note: z.string().trim().optional(),
        items: z
          .array(
            z.object({
              productId: z.number().int(),
              batchNo: z.string().trim().min(1, "Batch number is required"),
              expiryDate: isoDate,
              qty: z.number().int().positive(),
              costPrice: money,
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const today = todayBD();
      for (const it of input.items) {
        if (it.expiryDate <= today)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Batch ${it.batchNo} is already expired (${it.expiryDate}). Do not receive expired stock.`,
          });
      }
      const ids = [...new Set(input.items.map((i) => i.productId))];
      const found = await ctx.db.select({ id: product.id }).from(product).where(inArray(product.id, ids));
      if (found.length !== ids.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown product in purchase." });

      const total = input.items.reduce((s, i) => s + i.qty * i.costPrice, 0);
      return ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .insert(purchase)
          .values({
            supplierId: input.supplierId,
            invoiceNo: input.invoiceNo,
            purchaseDate: input.purchaseDate,
            total,
            paid: Math.min(input.paid, total),
            note: input.note,
            createdBy: ctx.session.user.id,
          })
          .returning();
        await tx.insert(batch).values(
          input.items.map((i) => ({
            productId: i.productId,
            purchaseId: p!.id,
            supplierId: input.supplierId,
            batchNo: i.batchNo,
            expiryDate: i.expiryDate,
            costPrice: i.costPrice,
            qtyReceived: i.qty,
            qtyRemaining: i.qty,
          })),
        );
        const [sup] = await tx.select({ name: supplier.name }).from(supplier).where(eq(supplier.id, input.supplierId));
        await audit(tx, ctx.session.user.id, "purchase.received", "purchase", p!.id,
          `Received ${input.items.length} line(s) from ${sup?.name ?? "supplier"}, total ${taka(total)}, paid ${taka(p!.paid)}`,
          { invoiceNo: input.invoiceNo });
        return p!;
      });
    }),

  pay: managerProcedure
    .input(z.object({ id: z.number().int(), amount: money }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [p] = await tx.select().from(purchase).where(eq(purchase.id, input.id)).for("update");
        if (!p) throw new TRPCError({ code: "NOT_FOUND" });
        const paid = Math.min(p.total, p.paid + input.amount);
        const [row] = await tx.update(purchase).set({ paid }).where(eq(purchase.id, input.id)).returning();
        await audit(tx, ctx.session.user.id, "purchase.paid", "purchase", p.id,
          `Paid ${taka(paid - p.paid)} to supplier (purchase #${p.id}${p.invoiceNo ? `, ${p.invoiceNo}` : ""}); due now ${taka(p.total - paid)}`);
        return row!;
      });
    }),
});
