import { user } from "@qsi-medicine/db/schema/auth";
import { batch, product, stockAdjustment, supplier } from "@qsi-medicine/db/schema/pos";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure, router } from "../../index";
import { type Tx, addDays, audit, todayBD } from "./_shared";
import { sellableStockSql } from "./product";

export const adjustReason = z.enum(["count_correction", "damaged", "expired", "lost", "found", "supplier_return"]);
const reasonLabel: Record<z.infer<typeof adjustReason>, string> = {
  count_correction: "stock count correction",
  damaged: "damaged",
  expired: "expired write-off",
  lost: "lost / missing",
  found: "found",
  supplier_return: "returned to supplier",
};

export const stockRouter = router({
  /** Products at or below their reorder level (sellable stock only). */
  lowStock: protectedProcedure.query(async ({ ctx }) => {
    const stock = sellableStockSql();
    return ctx.db
      .select({
        id: product.id,
        name: product.name,
        strength: product.strength,
        reorderLevel: product.reorderLevel,
        stock,
      })
      .from(product)
      .where(and(eq(product.active, true), lte(stock, product.reorderLevel)))
      .orderBy(asc(stock));
  }),

  /** Batches with stock that expire within `days` (default 90), plus already-expired ones. */
  expiring: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(90) }).optional())
    .query(({ ctx, input }) => {
      const today = todayBD();
      const limit = addDays(today, input?.days ?? 90);
      return ctx.db
        .select({
          id: batch.id,
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate,
          qtyRemaining: batch.qtyRemaining,
          costPrice: batch.costPrice,
          productId: product.id,
          productName: product.name,
          strength: product.strength,
          storage: product.storage,
          supplierName: supplier.name,
          daysLeft: sql<number>`(${batch.expiryDate} - ${today}::date)`.mapWith(Number),
        })
        .from(batch)
        .innerJoin(product, eq(product.id, batch.productId))
        .leftJoin(supplier, eq(supplier.id, batch.supplierId))
        .where(and(gt(batch.qtyRemaining, 0), lte(batch.expiryDate, limit)))
        .orderBy(asc(batch.expiryDate));
    }),

  /** Write off the remaining quantity of a batch (expired). Recorded as an adjustment. */
  writeOff: managerProcedure
    .input(z.object({ batchId: z.number().int(), reason: adjustReason.default("expired"), note: z.string().trim().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [b] = await tx.select().from(batch).where(eq(batch.id, input.batchId)).for("update");
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        if (b.qtyRemaining === 0) return { ok: true };
        await applyAdjustment(tx, ctx.session.user.id, b, -b.qtyRemaining, input.reason, input.note);
        return { ok: true };
      }),
    ),

  /** Add or remove units from one batch (damaged, lost, found, supplier return…). */
  adjust: managerProcedure
    .input(
      z.object({
        batchId: z.number().int(),
        qtyChange: z.number().int().refine((n) => n !== 0, "Change cannot be zero"),
        reason: adjustReason,
        note: z.string().trim().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [b] = await tx.select().from(batch).where(eq(batch.id, input.batchId)).for("update");
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        if (b.qtyRemaining + input.qtyChange < 0)
          throw new TRPCError({ code: "BAD_REQUEST", message: `Batch ${b.batchNo} only has ${b.qtyRemaining} units.` });
        if (input.qtyChange > 0 && b.qtyRemaining + input.qtyChange > b.qtyReceived && input.reason !== "found")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Adding more than was received needs reason \"found\"." });
        await applyAdjustment(tx, ctx.session.user.id, b, input.qtyChange, input.reason, input.note);
        return { ok: true };
      }),
    ),

  /**
   * Physical stock count for one medicine: send the counted quantity of each batch;
   * differences are recorded as count corrections.
   */
  count: managerProcedure
    .input(
      z.object({
        productId: z.number().int(),
        counts: z.array(z.object({ batchId: z.number().int(), counted: z.number().int().min(0) })).min(1),
        note: z.string().trim().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(batch)
          .where(and(eq(batch.productId, input.productId), inArray(batch.id, input.counts.map((c) => c.batchId))))
          .for("update");
        if (rows.length !== input.counts.length)
          throw new TRPCError({ code: "BAD_REQUEST", message: "A batch does not belong to this medicine." });
        let changed = 0;
        for (const c of input.counts) {
          const b = rows.find((r) => r.id === c.batchId)!;
          const diff = c.counted - b.qtyRemaining;
          if (diff !== 0) {
            await applyAdjustment(tx, ctx.session.user.id, b, diff, "count_correction", input.note);
            changed++;
          }
        }
        return { changed };
      }),
    ),

  adjustments: managerProcedure
    .input(z.object({ productId: z.number().int().optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          id: stockAdjustment.id,
          createdAt: stockAdjustment.createdAt,
          qtyChange: stockAdjustment.qtyChange,
          qtyBefore: stockAdjustment.qtyBefore,
          reason: stockAdjustment.reason,
          note: stockAdjustment.note,
          batchNo: batch.batchNo,
          costPrice: batch.costPrice,
          productName: product.name,
          strength: product.strength,
          by: user.name,
        })
        .from(stockAdjustment)
        .innerJoin(batch, eq(batch.id, stockAdjustment.batchId))
        .innerJoin(product, eq(product.id, stockAdjustment.productId))
        .leftJoin(user, eq(user.id, stockAdjustment.createdBy))
        .where(input?.productId ? eq(stockAdjustment.productId, input.productId) : undefined)
        .orderBy(desc(stockAdjustment.createdAt), desc(stockAdjustment.id))
        .limit(300),
    ),

  /** Inventory valuation at cost and at sale price (non-expired stock). */
  valuation: managerProcedure.query(async ({ ctx }) => {
    const today = todayBD();
    const [row] = await ctx.db
      .select({
        units: sql<number>`coalesce(sum(${batch.qtyRemaining}),0)`.mapWith(Number),
        atCost: sql<number>`coalesce(sum(${batch.qtyRemaining} * ${batch.costPrice}),0)`.mapWith(Number),
        atSale: sql<number>`coalesce(sum(${batch.qtyRemaining} * ${product.salePrice}),0)`.mapWith(Number),
      })
      .from(batch)
      .innerJoin(product, eq(product.id, batch.productId))
      .where(and(gt(batch.qtyRemaining, 0), gte(batch.expiryDate, today)));
    const [expired] = await ctx.db
      .select({
        atCost: sql<number>`coalesce(sum(${batch.qtyRemaining} * ${batch.costPrice}),0)`.mapWith(Number),
      })
      .from(batch)
      .where(and(gt(batch.qtyRemaining, 0), lt(batch.expiryDate, today)));
    return { ...row!, expiredAtCost: expired!.atCost };
  }),
});

async function applyAdjustment(
  tx: Tx,
  userId: string,
  b: typeof batch.$inferSelect,
  qtyChange: number,
  reason: z.infer<typeof adjustReason>,
  note?: string,
) {
  await tx
    .update(batch)
    .set({ qtyRemaining: sql`${batch.qtyRemaining} + ${qtyChange}` })
    .where(eq(batch.id, b.id));
  await tx.insert(stockAdjustment).values({
    batchId: b.id, productId: b.productId, qtyChange, qtyBefore: b.qtyRemaining, reason, note, createdBy: userId,
  });
  const [p] = await tx.select({ name: product.name }).from(product).where(eq(product.id, b.productId));
  await audit(
    tx, userId, `stock.${reason}`, "batch", b.id,
    `${p?.name} batch ${b.batchNo}: ${qtyChange > 0 ? "+" : ""}${qtyChange} (${b.qtyRemaining} → ${b.qtyRemaining + qtyChange}), ${reasonLabel[reason]}${note ? ` — ${note}` : ""}`,
    { productId: b.productId, qtyChange, qtyBefore: b.qtyRemaining, reason, note },
  );
}
