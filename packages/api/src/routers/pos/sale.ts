import type { Database } from "@qsi-medicine/db";
import { batch, customer, product, sale, saleItem, saleReturn, saleReturnItem } from "@qsi-medicine/db/schema/pos";
import { user } from "@qsi-medicine/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure, router } from "../../index";
import { audit, isoDate, money, periodRange, taka, todayBD } from "./_shared";

const paymentMethod = z.enum(["cash", "card", "bkash", "nagad"]);

export const saleRouter = router({
  /**
   * Complete a sale.
   * - Stock is allocated First-Expiry-First-Out across non-expired batches.
   * - Batch rows are locked (SELECT … FOR UPDATE) so two counters can't oversell.
   * - Prescription-only products require a prescription reference.
   */
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().int().optional(),
        items: z
          .array(
            z.object({
              productId: z.number().int(),
              qty: z.number().int().positive(),
              unitPrice: money.optional(), // defaults to product sale price
            }),
          )
          .min(1),
        discount: money.default(0),
        paid: money,
        paymentMethod,
        prescription: z
          .object({
            doctorName: z.string().trim().min(1),
            doctorRegNo: z.string().trim().optional(),
            note: z.string().trim().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const today = todayBD();
      // merge duplicate lines
      const merged = new Map<number, { qty: number; unitPrice?: number }>();
      for (const it of input.items) {
        const prev = merged.get(it.productId);
        merged.set(it.productId, { qty: (prev?.qty ?? 0) + it.qty, unitPrice: it.unitPrice ?? prev?.unitPrice });
      }
      const ids = [...merged.keys()];

      return ctx.db.transaction(async (tx) => {
        const products = await tx.select().from(product).where(inArray(product.id, ids));
        if (products.length !== ids.length)
          throw new TRPCError({ code: "BAD_REQUEST", message: "One of the products no longer exists." });

        const rxItems = products.filter((p) => p.rxRequired);
        if (rxItems.length && !input.prescription)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Prescription required for: ${rxItems.map((p) => p.name).join(", ")}. Record the prescribing doctor to continue.`,
          });

        const lines: Array<typeof saleItem.$inferInsert> = [];
        let subtotal = 0;

        for (const p of products) {
          const want = merged.get(p.id)!;
          const unitPrice = want.unitPrice ?? p.salePrice;
          let remaining = want.qty;

          const batches = await tx
            .select()
            .from(batch)
            .where(and(eq(batch.productId, p.id), gt(batch.qtyRemaining, 0), gte(batch.expiryDate, today)))
            .orderBy(asc(batch.expiryDate), asc(batch.id))
            .for("update");

          const available = batches.reduce((s, b) => s + b.qtyRemaining, 0);
          if (available < remaining)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Not enough sellable stock for ${p.name}: ${available} available, ${remaining} requested.`,
            });

          for (const b of batches) {
            if (remaining === 0) break;
            const take = Math.min(b.qtyRemaining, remaining);
            await tx
              .update(batch)
              .set({ qtyRemaining: sql`${batch.qtyRemaining} - ${take}` })
              .where(eq(batch.id, b.id));
            lines.push({
              saleId: 0,
              productId: p.id,
              batchId: b.id,
              qty: take,
              unitPrice,
              unitCost: b.costPrice,
              lineTotal: take * unitPrice,
            });
            subtotal += take * unitPrice;
            remaining -= take;
          }
        }

        const discount = Math.min(input.discount, subtotal);
        const total = subtotal - discount;
        if (input.paid < total)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Amount paid is less than the total." });

        const tmp = `TMP-${crypto.randomUUID()}`;
        const [s] = await tx
          .insert(sale)
          .values({
            invoiceNo: tmp,
            customerId: input.customerId,
            subtotal,
            discount,
            total,
            paid: input.paid,
            change: input.paid - total,
            paymentMethod: input.paymentMethod,
            prescription: rxItems.length || input.prescription ? input.prescription : undefined,
            createdBy: ctx.session.user.id,
          })
          .returning();
        const invoiceNo = `QSI-${today.replaceAll("-", "").slice(2)}-${String(s!.id).padStart(5, "0")}`;
        await tx.update(sale).set({ invoiceNo }).where(eq(sale.id, s!.id));
        await tx.insert(saleItem).values(lines.map((l) => ({ ...l, saleId: s!.id })));

        return { id: s!.id, invoiceNo, total, change: input.paid - total };
      });
    }),

  /** Invoice detail for viewing / printing. */
  get: protectedProcedure.input(z.object({ id: z.number().int() })).query(async ({ ctx, input }) => {
    const [head] = await ctx.db
      .select({ sale, customerName: customer.name, customerPhone: customer.phone, cashier: user.name })
      .from(sale)
      .leftJoin(customer, eq(customer.id, sale.customerId))
      .leftJoin(user, eq(user.id, sale.createdBy))
      .where(eq(sale.id, input.id));
    if (!head) throw new TRPCError({ code: "NOT_FOUND" });
    const items = await ctx.db
      .select({
        id: saleItem.id,
        qty: saleItem.qty,
        qtyReturned: saleItem.qtyReturned,
        unitPrice: saleItem.unitPrice,
        lineTotal: saleItem.lineTotal,
        productName: product.name,
        strength: product.strength,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
      })
      .from(saleItem)
      .innerJoin(product, eq(product.id, saleItem.productId))
      .innerJoin(batch, eq(batch.id, saleItem.batchId))
      .where(eq(saleItem.saleId, input.id));
    return { ...head, items };
  }),

  /** Sales history with date filter and invoice/customer search. */
  list: protectedProcedure
    .input(z.object({ from: isoDate.optional(), to: isoDate.optional(), search: z.string().optional() }).optional())
    .query(({ ctx, input: i }) => {
      const from = i?.from ? periodRange("day", i.from).from : undefined;
      const to = i?.to ? periodRange("day", i.to).to : undefined;
      const s = i?.search?.trim();
      return ctx.db
        .select({
          id: sale.id,
          invoiceNo: sale.invoiceNo,
          createdAt: sale.createdAt,
          total: sale.total,
          discount: sale.discount,
          paymentMethod: sale.paymentMethod,
          status: sale.status,
          hasRx: sql<boolean>`${sale.prescription} is not null`,
          customerName: customer.name,
          items: sql<number>`(select coalesce(sum(si.qty),0) from sale_item si where si.sale_id = "sale"."id")`.mapWith(Number),
          refunded: sql<number>`(select coalesce(sum(sr.refund_amount),0) from sale_return sr where sr.sale_id = "sale"."id")`.mapWith(Number),
        })
        .from(sale)
        .leftJoin(customer, eq(customer.id, sale.customerId))
        .where(
          and(
            from ? gte(sale.createdAt, from) : undefined,
            to ? lt(sale.createdAt, to) : undefined,
            s ? or(ilike(sale.invoiceNo, `%${s}%`), ilike(customer.name, `%${s}%`), ilike(customer.phone, `%${s}%`)) : undefined,
          ),
        )
        .orderBy(desc(sale.createdAt))
        .limit(300);
    }),

  /**
   * Return some or all items of a sale.
   * - Refund per line is reduced in proportion to any invoice discount.
   * - The return that completes the invoice refunds exactly what is left, so rounding never drifts.
   * - `restock: false` for opened/damaged medicine: refunded, but not put back on the shelf.
   */
  return: managerProcedure
    .input(
      z.object({
        saleId: z.number().int(),
        items: z.array(z.object({ saleItemId: z.number().int(), qty: z.number().int().positive() })).optional(),
        reason: z.string().trim().min(3, "Give a reason"),
        restock: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) => returnSale(ctx.db, ctx.session.user.id, input)),

  /** Convenience: return everything still returnable, back to stock. */
  refund: managerProcedure
    .input(z.object({ id: z.number().int(), reason: z.string().trim().min(3) }))
    .mutation(({ ctx, input }) =>
      returnSale(ctx.db, ctx.session.user.id, { saleId: input.id, reason: input.reason, restock: true }),
    ),

  returns: protectedProcedure.input(z.object({ saleId: z.number().int() })).query(({ ctx, input }) =>
    ctx.db
      .select({ ret: saleReturn, by: user.name })
      .from(saleReturn)
      .leftJoin(user, eq(user.id, saleReturn.createdBy))
      .where(eq(saleReturn.saleId, input.saleId))
      .orderBy(asc(saleReturn.createdAt)),
  ),
});

async function returnSale(
  db: Database,
  userId: string,
  input: { saleId: number; items?: { saleItemId: number; qty: number }[]; reason: string; restock: boolean },
) {
  return db.transaction(async (tx) => {
    const [s] = await tx.select().from(sale).where(eq(sale.id, input.saleId)).for("update");
    if (!s) throw new TRPCError({ code: "NOT_FOUND" });
    if (s.status === "returned") throw new TRPCError({ code: "BAD_REQUEST", message: "Already returned in full." });

    const lines = await tx.select().from(saleItem).where(eq(saleItem.saleId, s.id)).for("update");
    const byId = new Map(lines.map((l) => [l.id, l]));
    const wanted =
      input.items ??
      lines.filter((l) => l.qty > l.qtyReturned).map((l) => ({ saleItemId: l.id, qty: l.qty - l.qtyReturned }));
    if (!wanted.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to return." });

    // validate & merge
    const take = new Map<number, number>();
    for (const w of wanted) take.set(w.saleItemId, (take.get(w.saleItemId) ?? 0) + w.qty);
    for (const [id, qty] of take) {
      const l = byId.get(id);
      if (!l) throw new TRPCError({ code: "BAD_REQUEST", message: "Item does not belong to this sale." });
      if (qty > l.qty - l.qtyReturned)
        throw new TRPCError({ code: "BAD_REQUEST", message: `Only ${l.qty - l.qtyReturned} left to return on one of the items.` });
    }

    const ratio = s.subtotal > 0 ? s.total / s.subtotal : 0; // discount share
    const parts = [...take].map(([id, qty]) => {
      const l = byId.get(id)!;
      return { l, qty, refund: Math.round(qty * l.unitPrice * ratio), cost: qty * l.unitCost };
    });

    const completesSale = lines.every((l) => l.qty - l.qtyReturned === (take.get(l.id) ?? 0));
    if (completesSale) {
      // refund exactly what is left of the paid total
      const [prev] = await tx
        .select({ sum: sql<number>`coalesce(sum(${saleReturn.refundAmount}),0)`.mapWith(Number) })
        .from(saleReturn)
        .where(eq(saleReturn.saleId, s.id));
      const remaining = s.total - prev!.sum;
      const drift = remaining - parts.reduce((a, p) => a + p.refund, 0);
      parts[parts.length - 1]!.refund += drift;
    }
    const refundAmount = parts.reduce((a, p) => a + p.refund, 0);

    const [ret] = await tx
      .insert(saleReturn)
      .values({ saleId: s.id, refundAmount, reason: input.reason, restocked: input.restock, createdBy: userId })
      .returning();
    await tx.insert(saleReturnItem).values(
      parts.map((p) => ({ returnId: ret!.id, saleItemId: p.l.id, qty: p.qty, refund: p.refund, cost: p.cost })),
    );
    for (const p of parts) {
      await tx
        .update(saleItem)
        .set({ qtyReturned: sql`${saleItem.qtyReturned} + ${p.qty}` })
        .where(eq(saleItem.id, p.l.id));
      if (input.restock)
        await tx
          .update(batch)
          .set({ qtyRemaining: sql`${batch.qtyRemaining} + ${p.qty}` })
          .where(eq(batch.id, p.l.batchId));
    }
    const status = completesSale ? "returned" : "partially_returned";
    await tx.update(sale).set({ status }).where(eq(sale.id, s.id));

    const units = parts.reduce((a, p) => a + p.qty, 0);
    await audit(
      tx, userId, completesSale ? "sale.returned" : "sale.partially_returned", "sale", s.id,
      `${s.invoiceNo}: returned ${units} unit(s), refunded ${taka(refundAmount)}${input.restock ? "" : " (not restocked)"} — ${input.reason}`,
      { returnId: ret!.id, refundAmount, restock: input.restock, items: parts.map((p) => ({ saleItemId: p.l.id, qty: p.qty })) },
    );
    return { returnId: ret!.id, refundAmount, status };
  });
}
