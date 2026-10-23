/**
 * Roles, sign-up lock and staff management.
 * Uses a real Better Auth instance against the test database.
 */
import { createAuth } from "@qsi-medicine/auth";
import { createDb } from "@qsi-medicine/db";
import { user } from "@qsi-medicine/db/schema/auth";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, test } from "bun:test";

import { appRouter } from "../src/routers/index";

const db = createDb({ DATABASE_URL: process.env.DATABASE_URL! } as never);
const auth = createAuth({ BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234", CORS_ORIGIN: "http://localhost:3001" }, db);
const caller = (u: { id: string; role: string; active?: boolean }) =>
  appRouter.createCaller({ db, session: { user: { name: "x", email: "x", active: true, ...u }, session: {} } as never });

let managerId: string;

beforeAll(async () => {
  await db.execute(sql`truncate audit_log, stock_adjustment, sale_return_item, sale_return, sale_item, sale, batch, purchase, product, supplier, customer, expense restart identity cascade`);
  await db.execute(sql`truncate "user" cascade`);
});

describe("sign-up lock", () => {
  test("setup is needed on an empty system", async () => {
    expect(await appRouter.createCaller({ db, session: null } as never).pos.staff.needsSetup()).toBe(true);
  });

  test("first account becomes an active manager; injected role/active values are ignored", async () => {
    const r = await auth.api.signUpEmail({
      body: { name: "Owner", email: "owner@qsi.test", password: "Owner@1234", role: "cashier", active: false } as never,
    });
    managerId = r.user.id;
    const [u] = await db.select().from(user).where(eq(user.id, managerId));
    expect(u).toMatchObject({ role: "manager", active: true });
  });

  test("every later public sign-up is refused", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "Stranger", email: "s@qsi.test", password: "Stranger@1234" } }),
    ).rejects.toThrow(/Sign-up is closed/);
    expect(await appRouter.createCaller({ db, session: null } as never).pos.staff.needsSetup()).toBe(false);
  });
});

describe("staff management", () => {
  let cashierId: string;

  test("manager creates a cashier who can then sign in", async () => {
    const mgr = caller({ id: managerId, role: "manager" });
    cashierId = (await mgr.pos.staff.create({ name: "Karim", email: "Karim@QSI.test", password: "Cashier@1234", role: "cashier" })).id;
    const r = await auth.api.signInEmail({ body: { email: "karim@qsi.test", password: "Cashier@1234" } });
    expect(r.user.id).toBe(cashierId);
    await expect(mgr.pos.staff.create({ name: "Dup", email: "karim@qsi.test", password: "Another@1234", role: "cashier" })).rejects.toThrow(/already exists/);
  });

  test("cashier is blocked from manager actions", async () => {
    const c = caller({ id: cashierId, role: "cashier" });
    await expect(c.pos.report.summary({ period: "day" })).rejects.toThrow(/Only a manager/);
    await expect(c.pos.product.create({ name: "X", salePrice: 100 } as never)).rejects.toThrow(/Only a manager/);
    await expect(c.pos.sale.refund({ id: 1, reason: "test" })).rejects.toThrow(/Only a manager/);
    await expect(c.pos.stock.writeOff({ batchId: 1 })).rejects.toThrow(/Only a manager/);
    await expect(c.pos.expense.list()).rejects.toThrow(/Only a manager/);
    await expect(c.pos.staff.list()).rejects.toThrow(/Only a manager/);
    await expect(c.pos.staff.create({ name: "Y", email: "y@qsi.test", password: "Yyyyyyyy1", role: "manager" })).rejects.toThrow(/Only a manager/);
    // …but can do counter work
    expect(Array.isArray(await c.pos.product.list())).toBe(true);
    expect(Array.isArray(await c.pos.customer.list())).toBe(true);
  });

  test("a cashier cannot promote themselves through the profile-update endpoint", async () => {
    const r = await auth.api.signInEmail({ body: { email: "karim@qsi.test", password: "Cashier@1234" }, returnHeaders: true });
    const cookie = r.headers.get("set-cookie")!.split(";")[0]!;
    for (const body of [{ role: "manager" }, { active: true }]) {
      await expect(auth.api.updateUser({ headers: new Headers({ cookie }), body: body as never })).rejects.toThrow(/not allowed/);
    }
    const [u] = await db.select().from(user).where(eq(user.id, cashierId));
    expect(u!.role).toBe("cashier");
  });

  test("the last active manager cannot be demoted or deactivated", async () => {
    const mgr = caller({ id: managerId, role: "manager" });
    await expect(mgr.pos.staff.setRole({ userId: managerId, role: "cashier" })).rejects.toThrow(/at least one active manager/);
    await expect(mgr.pos.staff.setActive({ userId: managerId, active: false })).rejects.toThrow(/own account/);
  });

  test("deactivation signs the user out and blocks sign-in and API use", async () => {
    const mgr = caller({ id: managerId, role: "manager" });
    await mgr.pos.staff.setActive({ userId: cashierId, active: false });
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from session where user_id = ${cashierId}`)).rows as [{ n: number }];
    expect(n).toBe(0);
    await expect(auth.api.signInEmail({ body: { email: "karim@qsi.test", password: "Cashier@1234" } })).rejects.toThrow();
    await expect(caller({ id: cashierId, role: "cashier", active: false }).pos.product.list()).rejects.toThrow(/deactivated/);
    await mgr.pos.staff.setActive({ userId: cashierId, active: true });
  });

  test("password reset works and old password stops working", async () => {
    const mgr = caller({ id: managerId, role: "manager" });
    await mgr.pos.staff.resetPassword({ userId: cashierId, password: "NewPass@5678" });
    await expect(auth.api.signInEmail({ body: { email: "karim@qsi.test", password: "Cashier@1234" } })).rejects.toThrow();
    const r = await auth.api.signInEmail({ body: { email: "karim@qsi.test", password: "NewPass@5678" } });
    expect(r.user.id).toBe(cashierId);
  });

  test("promoting a second manager then allows demoting the first", async () => {
    const mgr = caller({ id: managerId, role: "manager" });
    await mgr.pos.staff.setRole({ userId: cashierId, role: "manager" });
    await mgr.pos.staff.setRole({ userId: managerId, role: "cashier" });
    const list = await caller({ id: cashierId, role: "manager" }).pos.staff.list();
    expect(list.find((u) => u.id === managerId)?.role).toBe("cashier");
  });
});
