/**
 * Integration tests for the POS API against a real Postgres.
 * Run: DATABASE_URL=postgres://... bun test packages/api/test
 */
import { createDb } from "@qsi-medicine/db";
import { user } from "@qsi-medicine/db/schema/auth";
import { batch } from "@qsi-medicine/db/schema/pos";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, test } from "bun:test";

import { appRouter } from "../src/routers/index";
import { addDays, todayBD } from "../src/routers/pos/_shared";

const db = createDb({ DATABASE_URL: process.env.DATABASE_URL! } as never);
const session = { user: { id: "test-user", name: "Test Manager", email: "t@qsi.test", role: "manager", active: true }, session: {} } as never;
const api = appRouter.createCaller({ db, session });
const today = todayBD();

let napa: number, ceftri: number, supplierId: number;

beforeAll(async () => {
  await db.execute(sql`truncate audit_log, stock_adjustment, sale_return_item, sale_return, sale_item, sale, batch, purchase, product, supplier, customer, expense restart identity cascade`);
  await db.execute(sql`truncate "user" cascade`);
  await db.insert(user).values({ id: "test-user", name: "Test Manager", email: "t@qsi.test", role: "manager" });
  supplierId = (await api.pos.supplier.create({ name: "Beximco Distributor" })).id;
  napa = (await api.pos.product.create({ name: "Napa Extend", strength: "665 mg", salePrice: 250, barcode: "8941100500010", reorderLevel: 20 }))!.id;
  ceftri = (await api.pos.product.create({ name: "Ceftron", strength: "1 g inj", salePrice: 25000, rxRequired: true, storage: "cold", reorderLevel: 5 }))!.id;
});

describe("purchase", () => {
  test("rejects already-expired stock", async () => {
    await expect(
      api.pos.purchase.create({
        supplierId, purchaseDate: today,
        items: [{ productId: napa, batchNo: "OLD", expiryDate: addDays(today, -1), qty: 10, costPrice: 150 }],
      }),
    ).rejects.toThrow(/expired/);
  });

  test("creates batches", async () => {
    await api.pos.purchase.create({
      supplierId, purchaseDate: today, invoiceNo: "BX-1", paid: 10000,
      items: [
        { productId: napa, batchNo: "N-LATE", expiryDate: addDays(today, 400), qty: 50, costPrice: 180 },
        { productId: napa, batchNo: "N-EARLY", expiryDate: addDays(today, 20), qty: 10, costPrice: 150 },
        { productId: ceftri, batchNo: "C-1", expiryDate: addDays(today, 200), qty: 6, costPrice: 20000 },
      ],
    });
    // simulate an expired batch already on the shelf
    await db.insert(batch).values({ productId: napa, batchNo: "N-EXPIRED", expiryDate: addDays(today, -5), costPrice: 100, qtyReceived: 30, qtyRemaining: 30 });
    const list = await api.pos.product.list({ search: "napa" });
    expect(list[0]!.stock).toBe(60); // expired 30 excluded
  });
});

describe("sale", () => {
  test("barcode lookup", async () => {
    const p = await api.pos.product.byBarcode({ code: "8941100500010" });
    expect(p?.id).toBe(napa);
  });

  test("FEFO: sells the earliest non-expired batch first, never the expired one", async () => {
    const r = await api.pos.sale.create({ items: [{ productId: napa, qty: 12 }], paid: 5000, paymentMethod: "cash" });
    expect(r.total).toBe(3000);
    expect(r.change).toBe(2000);
    expect(r.invoiceNo).toMatch(/^QSI-\d{6}-00001$/);
    const inv = await api.pos.sale.get({ id: r.id });
    const byBatch = Object.fromEntries(inv.items.map((i) => [i.batchNo, i.qty]));
    expect(byBatch).toEqual({ "N-EARLY": 10, "N-LATE": 2 });
  });

  test("blocks prescription item without prescription", async () => {
    await expect(
      api.pos.sale.create({ items: [{ productId: ceftri, qty: 1 }], paid: 25000, paymentMethod: "cash" }),
    ).rejects.toThrow(/Prescription required/);
  });

  test("allows prescription item with doctor recorded, plus discount and customer", async () => {
    const c = await api.pos.customer.create({ name: "Rahim Uddin", phone: "01711000000" });
    const r = await api.pos.sale.create({
      customerId: c.id,
      items: [{ productId: ceftri, qty: 2 }],
      discount: 1000, paid: 49000, paymentMethod: "bkash",
      prescription: { doctorName: "Dr. Karim", doctorRegNo: "A-12345" },
    });
    expect(r.total).toBe(49000);
    const hist = await api.pos.customer.history({ customerId: c.id });
    expect(hist).toHaveLength(1);
    const [cust] = await api.pos.customer.list({ search: "017110" });
    expect(cust).toMatchObject({ visits: 1, spent: 49000 });
    const sales = await api.pos.sale.list({ search: "Rahim" });
    expect(sales[0]!.items).toBe(2);
  });

  test("prevents overselling", async () => {
    await expect(
      api.pos.sale.create({ items: [{ productId: ceftri, qty: 10 }], paid: 999999, paymentMethod: "cash", prescription: { doctorName: "Dr. X" } }),
    ).rejects.toThrow(/Not enough sellable stock/);
  });

  test("rejects underpayment", async () => {
    await expect(api.pos.sale.create({ items: [{ productId: napa, qty: 1 }], paid: 100, paymentMethod: "cash" })).rejects.toThrow(/less than/);
  });

  test("concurrent sales cannot oversell (row locks)", async () => {
    // 48 napa left sellable. Two parallel sales of 30 — only one can succeed.
    const results = await Promise.allSettled([
      api.pos.sale.create({ items: [{ productId: napa, qty: 30 }], paid: 7500, paymentMethod: "cash" }),
      api.pos.sale.create({ items: [{ productId: napa, qty: 30 }], paid: 7500, paymentMethod: "cash" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [p] = await api.pos.product.list({ search: "napa" });
    expect(p!.stock).toBe(18);
  });

  test("refund restores stock", async () => {
    const r = await api.pos.sale.create({ items: [{ productId: napa, qty: 3 }], paid: 750, paymentMethod: "card" });
    await api.pos.sale.refund({ id: r.id, reason: "Wrong strength" });
    const [p] = await api.pos.product.list({ search: "napa" });
    expect(p!.stock).toBe(18);
    await expect(api.pos.sale.refund({ id: r.id, reason: "again" })).rejects.toThrow(/Already/);
  });
});

describe("alerts & reports", () => {
  test("low stock, expiring and expired", async () => {
    const low = await api.pos.stock.lowStock();
    expect(low.map((l) => l.name)).toContain("Napa Extend"); // 18 <= 20
    const exp = await api.pos.stock.expiring({ days: 30 });
    expect(exp.map((e) => e.batchNo)).toEqual(["N-EXPIRED"]); // N-EARLY sold out
    const dash = await api.pos.dashboard.overview();
    expect(dash.expiredWithStock).toBe(1);
    expect(dash.lowStock).toBeGreaterThanOrEqual(1);
  });

  test("daily P&L", async () => {
    await api.pos.expense.create({ expenseDate: today, category: "Electricity", amount: 2000 });
    const r = await api.pos.report.summary({ period: "day" });
    // completed sales: 12 napa (3000) + 2 ceftron (50000-1000=49000) + 30 napa (7500)
    expect(r.revenue).toBe(3000 + 49000 + 7500);
    // cogs: 10*150 + 2*180 + 2*20000 + 30*180
    const cogs = 1500 + 360 + 40000 + 5400;
    expect(r.cogs).toBe(cogs);
    expect(r.grossProfit).toBe(59500 - cogs);
    expect(r.netProfit).toBe(59500 - cogs - 2000);
    expect(r.returns.count).toBe(1);
    expect(r.invoices).toBe(3);
    for (const p of ["month", "year"] as const) {
      const s = await api.pos.report.summary({ period: p });
      expect(s.revenue).toBe(59500);
    }
  });
});
