import { batch, product } from "@qsi-medicine/db/schema/pos";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure, router } from "../../index";
import { audit, money, taka, todayBD } from "./_shared";

const input = z.object({
  name: z.string().trim().min(1),
  generic: z.string().trim().nullish().transform((v) => v || null),
  strength: z.string().trim().nullish().transform((v) => v || null),
  form: z.string().trim().nullish().transform((v) => v || null),
  manufacturer: z.string().trim().nullish().transform((v) => v || null),
  category: z.string().trim().nullish().transform((v) => v || null),
  barcode: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v || null),
  unit: z.string().trim().default("pcs"),
  salePrice: money,
  reorderLevel: z.number().int().min(0).default(10),
  rxRequired: z.boolean().default(false),
  storage: z.enum(["ambient", "cold"]).default("ambient"),
});

/** Sellable stock = remaining qty in batches that are not expired. */
export function sellableStockSql() {
  const today = todayBD();
  // Table names are written out: Drizzle renders columns unqualified inside raw subqueries.
  return sql<number>`coalesce((
    select sum(b.qty_remaining) from batch b
    where b.product_id = "product"."id" and b.expiry_date >= ${today}
  ), 0)`.mapWith(Number);
}

function uniqueViolation(e: unknown) {
  const code = (e as { code?: string; cause?: { code?: string } })?.cause?.code ?? (e as { code?: string })?.code;
  if (code === "23505") throw new TRPCError({ code: "CONFLICT", message: "That barcode is already used by another product." });
  throw e;
}

export const productRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({ search: z.string().optional(), includeInactive: z.boolean().optional() })
        .optional(),
    )
    .query(({ ctx, input: i }) => {
      const s = i?.search?.trim();
      return ctx.db
        .select({
          id: product.id,
          name: product.name,
          generic: product.generic,
          strength: product.strength,
          form: product.form,
          manufacturer: product.manufacturer,
          category: product.category,
          barcode: product.barcode,
          unit: product.unit,
          salePrice: product.salePrice,
          reorderLevel: product.reorderLevel,
          rxRequired: product.rxRequired,
          storage: product.storage,
          active: product.active,
          stock: sellableStockSql(),
        })
        .from(product)
        .where(
          and(
            i?.includeInactive ? undefined : eq(product.active, true),
            s
              ? or(
                  ilike(product.name, `%${s}%`),
                  ilike(product.generic, `%${s}%`),
                  eq(product.barcode, s),
                )
              : undefined,
          ),
        )
        .orderBy(asc(product.name))
        .limit(200);
    }),

  /** Exact barcode match, used by the scanner at the counter. */
  byBarcode: protectedProcedure.input(z.object({ code: z.string().trim().min(1) })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select({
        id: product.id,
        name: product.name,
        strength: product.strength,
        salePrice: product.salePrice,
        rxRequired: product.rxRequired,
        storage: product.storage,
        unit: product.unit,
        stock: sellableStockSql(),
      })
      .from(product)
      .where(and(eq(product.barcode, input.code), eq(product.active, true)));
    return row ?? null;
  }),

  create: managerProcedure.input(input).mutation(async ({ ctx, input: i }) => {
    try {
      return await ctx.db.transaction(async (tx) => {
        const [row] = await tx.insert(product).values(i).returning();
        await audit(tx, ctx.session.user.id, "product.created", "product", row!.id,
          `Added ${row!.name}${row!.strength ? ` ${row!.strength}` : ""} at ${taka(row!.salePrice)}`);
        return row!;
      });
    } catch (e) {
      uniqueViolation(e);
    }
  }),

  update: managerProcedure
    .input(input.extend({ id: z.number().int(), active: z.boolean().optional() }))
    .mutation(async ({ ctx, input: { id, ...rest } }) => {
      try {
        return await ctx.db.transaction(async (tx) => {
          const [before] = await tx.select().from(product).where(eq(product.id, id)).for("update");
          if (!before) throw new TRPCError({ code: "NOT_FOUND" });
          const [row] = await tx.update(product).set(rest).where(eq(product.id, id)).returning();
          // record only fields that actually changed
          const changes: Record<string, { from: unknown; to: unknown }> = {};
          for (const k of Object.keys(rest) as (keyof typeof rest)[]) {
            if (rest[k] !== undefined && rest[k] !== before[k]) changes[k] = { from: before[k], to: rest[k] };
          }
          if (Object.keys(changes).length) {
            const priceChanged = "salePrice" in changes;
            const parts = Object.entries(changes).map(([k, v]) =>
              k === "salePrice" ? `price ${taka(v.from as number)} → ${taka(v.to as number)}` : `${k}: ${String(v.from ?? "–")} → ${String(v.to ?? "–")}`,
            );
            await audit(tx, ctx.session.user.id, priceChanged ? "product.price_changed" : "product.updated", "product", id,
              `${before.name}: ${parts.join(", ")}`, changes);
          }
          return row!;
        });
      } catch (e) {
        uniqueViolation(e);
      }
    }),

  batches: protectedProcedure.input(z.object({ productId: z.number().int() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(batch)
      .where(and(eq(batch.productId, input.productId), gte(batch.qtyRemaining, 1)))
      .orderBy(asc(batch.expiryDate)),
  ),
});
