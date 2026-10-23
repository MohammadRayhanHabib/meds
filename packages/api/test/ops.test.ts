/**
 * Partial returns, stock adjustments/counts, audit trail.
 */
import { createDb } from "@qsi-medicine/db";
import { user } from "@qsi-medicine/db/schema/auth";
import { batch } from "@qsi-medicine/db/schema/pos";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, test } from "bun:test";

import { appRouter } from "../src/routers/index";
import { addDays, todayBD } from "../src/routers/pos/_shared";

const db = createDb({ DATABASE_URL: process.env.DATABASE_URL! } as never);
const as = (id: string, role: "manager" | "cashier") =>
  appRouter.createCaller({ db, session: { user: { id, name: id, email: `${id}@qsi.test`, role, active: true }, session: {} } as never });
const mgr = as("mgr", "manager");
const cashier = as("csh", "cashier");
const today = todayBD();
let napa: number, seclo: number, napaBatch: number;

const stockOf = async (id: number) => (await mgr.pos.product.list({ includeInactive: true })).find((p) => p.id === id)!.stock;

beforeAll(async () => {
  await db.execute(sql`truncate audit_log, stock_adjustment, sale_return_item, sale_return, sale_item, sale, batch, purchase, product, supplier, customer, expense restart identity cascade`);
  await db.execute(sql`truncate "user" cascade`);
  await db.insert(user).values([
    { id: "mgr", name: "Manager", email: "mgr@qsi.test", role: "manager" },
    { id: "csh", name: "Cashier", email: "csh@qsi.test", role: "cashier" },
  ]);
  const sup = await mgr.pos.supplier.create({ name: "Square" });
  napa = (await mgr.pos.product.create({ name: "Napa", salePrice: 1000 } as never))!.id; // ৳10
  seclo = (await mgr.pos.product.create({ name: "Seclo", salePrice: 3000 } as never))!.id; // ৳30
  await mgr.pos.purchase.create({
    supplierId: sup.id, purchaseDate: today,
    items: [
      { productId: napa, batchNo: "NP1", expiryDate: addDays(today, 300), qty: 100, costPrice: 600 },
      { productId: seclo, batchNo: "SC1", expiryDate: addDays(today, 300), qty: 50, costPrice: 2000 },
    ],
  });
  napaBatch = (await db.select().from(batch).where(eq(batch.batchNo, "NP1")))[0]!.id;
});

describe("partial returns", () => {
  let saleId: number;
  let napaLine: number, secloLine: number;

  test("setup: sale of 10 Napa (৳100) + 5 Seclo (৳150), ৳25 discount → ৳225", async () => {
    const r = await cashier.pos.sale.create({ items: [{ productId: napa, qty: 10 }, { productId: seclo, qty: 5 }], discount: 2500, paid: 22500, paymentMethod: "cash" });
    saleId = r.id;
    expect(r.total).toBe(22500);
    const inv = await mgr.pos.sale.get({ id: saleId });
    napaLine = inv.items.find((i) => i.productName === "Napa")!.id;
    secloLine = inv.items.find((i) => i.productName === "Seclo")!.id;
  });

  test("cashier cannot process returns", async () => {
    await expect(cashier.pos.sale.return({ saleId, items: [{ saleItemId: napaLine, qty: 1 }], reason: "test", restock: true })).rejects.toThrow(/Only a manager/);
  });

  test("returning 4 Napa refunds ৳40 × (225/250) = ৳36 and restocks", async () => {
    const before = await stockOf(napa);
    const r = await mgr.pos.sale.return({ saleId, items: [{ saleItemId: napaLine, qty: 4 }], reason: "Too many", restock: true });
    expect(r).toMatchObject({ refundAmount: 3600, status: "partially_returned" });
    expect(await stockOf(napa)).toBe(before + 4);
  });

  test("cannot return more than remains on a line", async () => {
    await expect(mgr.pos.sale.return({ saleId, items: [{ saleItemId: napaLine, qty: 7 }], reason: "x x", restock: true })).rejects.toThrow(/Only 6 left/);
  });

  test("opened Seclo returned without restocking: refunded, stock unchanged", async () => {
    const before = await stockOf(seclo);
    const r = await mgr.pos.sale.return({ saleId, items: [{ saleItemId: secloLine, qty: 2 }], reason: "Strip opened", restock: false });
    expect(r.refundAmount).toBe(5400); // ৳60 × 0.9
    expect(await stockOf(seclo)).toBe(before);
  });

  test("final return refunds exactly what is left (no rounding drift)", async () => {
    const r = await mgr.pos.sale.return({ saleId, reason: "Customer cancelled", restock: true });
    expect(r.status).toBe("returned");
    expect(r.refundAmount).toBe(22500 - 3600 - 5400);
    const rets = await mgr.pos.sale.returns({ saleId });
    expect(rets.reduce((a, x) => a + x.ret.refundAmount, 0)).toBe(22500);
    await expect(mgr.pos.sale.return({ saleId, reason: "again", restock: true })).rejects.toThrow(/Already returned/);
  });

  test("P&L: fully returned sale nets to zero sales; unrestocked goods stay a cost", async () => {
    const r = await mgr.pos.report.summary({ period: "day" });
    expect(r.revenue).toBe(0);
    expect(r.refunds).toBe(22500);
    expect(r.invoices).toBe(0);
    // sold cost 10×6 + 5×20 = 160 tk; restocked back: 10 Napa (60) + 3 Seclo (60) → 2 opened Seclo (40) lost
    expect(r.cogs).toBe(4000);
    expect(r.grossProfit).toBe(-4000);
    const dash = await mgr.pos.dashboard.overview();
    expect(dash.todayRevenue).toBe(0);
  });
});

describe("stock adjustments & counts", () => {
  test("cannot remove more than the batch holds", async () => {
    const qty = (await db.select().from(batch).where(eq(batch.id, napaBatch)))[0]!.qtyRemaining;
    await expect(mgr.pos.stock.adjust({ batchId: napaBatch, qtyChange: -(qty + 1), reason: "damaged" })).rejects.toThrow(/only has/);
  });

  test("damaged adjustment reduces stock and is recorded with before-quantity", async () => {
    const before = await stockOf(napa);
    await mgr.pos.stock.adjust({ batchId: napaBatch, qtyChange: -3, reason: "damaged", note: "Water leak" });
    expect(await stockOf(napa)).toBe(before - 3);
    const [adj] = await mgr.pos.stock.adjustments({ productId: napa });
    expect(adj).toMatchObject({ qtyChange: -3, qtyBefore: before, reason: "damaged", note: "Water leak", by: "Manager" });
  });

  test("adding beyond received quantity requires reason 'found'", async () => {
    await expect(mgr.pos.stock.adjust({ batchId: napaBatch, qtyChange: 500, reason: "count_correction" })).rejects.toThrow(/found/);
    await mgr.pos.stock.adjust({ batchId: napaBatch, qtyChange: 1, reason: "found" });
  });

  test("physical count records only differences", async () => {
    const r = await mgr.pos.stock.count({ productId: napa, counts: [{ batchId: napaBatch, counted: 90 }], note: "Monthly count" });
    expect(r.changed).toBe(1);
    expect(await stockOf(napa)).toBe(90);
    const again = await mgr.pos.stock.count({ productId: napa, counts: [{ batchId: napaBatch, counted: 90 }] });
    expect(again.changed).toBe(0);
  });

  test("cashier cannot adjust stock", async () => {
    await expect(cashier.pos.stock.adjust({ batchId: napaBatch, qtyChange: -1, reason: "lost" })).rejects.toThrow(/Only a manager/);
  });
});

describe("audit trail", () => {
  test("price change records old and new price", async () => {
    await mgr.pos.product.update({ id: napa, name: "Napa", salePrice: 1200 } as never);
    const [log] = await mgr.pos.audit.list({ area: "product" });
    expect(log).toMatchObject({ action: "product.price_changed", by: "Manager" });
    expect(log!.summary).toContain("৳10.00 → ৳12.00");
  });

  test("editing without changes does not create noise", async () => {
    const n = (await mgr.pos.audit.list()).length;
    await mgr.pos.product.update({ id: napa, name: "Napa", salePrice: 1200 } as never);
    expect((await mgr.pos.audit.list()).length).toBe(n);
  });

  test("returns, adjustments and purchases are all logged", async () => {
    const actions = new Set((await mgr.pos.audit.list()).map((l) => l.action));
    for (const a of ["purchase.received", "sale.partially_returned", "sale.returned", "stock.damaged", "stock.found", "stock.count_correction", "product.created", "supplier.created"])
      expect(actions.has(a)).toBe(true);
  });

  test("cashier cannot read the audit log", async () => {
    await expect(cashier.pos.audit.list()).rejects.toThrow(/Only a manager/);
  });
});
