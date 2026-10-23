/**
 * Pharmacy POS schema.
 * Money is stored as integer poisha (1 taka = 100 poisha) to avoid float errors.
 * Dates that are calendar days (expiry, purchase date) use `date` in string mode (YYYY-MM-DD).
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const supplier = pgTable("supplier", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const product = pgTable(
  "product",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // brand name, e.g. "Napa Extend"
    generic: text("generic"), // e.g. "Paracetamol"
    strength: text("strength"), // e.g. "665 mg"
    form: text("form"), // tablet, syrup, injection...
    manufacturer: text("manufacturer"),
    category: text("category"),
    barcode: text("barcode"),
    unit: text("unit").default("pcs").notNull(),
    salePrice: integer("sale_price").notNull(), // poisha per unit
    reorderLevel: integer("reorder_level").default(10).notNull(),
    rxRequired: boolean("rx_required").default(false).notNull(),
    storage: text("storage").default("ambient").notNull(), // "ambient" | "cold"
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("product_barcode_uq").on(t.barcode), index("product_name_idx").on(t.name)],
);

export const purchase = pgTable("purchase", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => supplier.id),
  invoiceNo: text("invoice_no"), // supplier's invoice / challan number
  purchaseDate: date("purchase_date", { mode: "string" }).notNull(),
  total: integer("total").notNull(),
  paid: integer("paid").default(0).notNull(),
  note: text("note"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const batch = pgTable(
  "batch",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => product.id),
    purchaseId: integer("purchase_id").references(() => purchase.id),
    supplierId: integer("supplier_id").references(() => supplier.id),
    batchNo: text("batch_no").notNull(),
    expiryDate: date("expiry_date", { mode: "string" }).notNull(),
    costPrice: integer("cost_price").notNull(), // poisha per unit
    qtyReceived: integer("qty_received").notNull(),
    qtyRemaining: integer("qty_remaining").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("batch_product_idx").on(t.productId),
    index("batch_expiry_idx").on(t.expiryDate),
  ],
);

export const customer = pgTable(
  "customer",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"), // e.g. regular prescriber, preferred brand
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("customer_phone_idx").on(t.phone)],
);

export type PrescriptionRef = {
  doctorName: string;
  doctorRegNo?: string;
  note?: string;
};

export const sale = pgTable(
  "sale",
  {
    id: serial("id").primaryKey(),
    invoiceNo: text("invoice_no").notNull().unique(),
    customerId: integer("customer_id").references(() => customer.id),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").default(0).notNull(),
    total: integer("total").notNull(),
    paid: integer("paid").notNull(),
    change: integer("change").default(0).notNull(),
    paymentMethod: text("payment_method").notNull(), // cash | card | bkash | nagad
    prescription: jsonb("prescription").$type<PrescriptionRef>(),
    status: text("status").default("completed").notNull(), // completed | partially_returned | returned
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sale_created_idx").on(t.createdAt)],
);

export const saleItem = pgTable(
  "sale_item",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sale.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => product.id),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batch.id),
    qty: integer("qty").notNull(),
    unitPrice: integer("unit_price").notNull(),
    unitCost: integer("unit_cost").notNull(), // snapshot for profit calculation
    lineTotal: integer("line_total").notNull(),
    qtyReturned: integer("qty_returned").default(0).notNull(),
  },
  (t) => [index("sale_item_sale_idx").on(t.saleId)],
);

export const expense = pgTable("expense", {
  id: serial("id").primaryKey(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  category: text("category").notNull(), // rent, salary, utility, other
  amount: integer("amount").notNull(),
  note: text("note"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** A return against a sale. One sale can have several partial returns. */
export const saleReturn = pgTable(
  "sale_return",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sale.id),
    refundAmount: integer("refund_amount").notNull(),
    reason: text("reason").notNull(),
    restocked: boolean("restocked").notNull(), // false = opened/damaged, not put back on the shelf
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sale_return_sale_idx").on(t.saleId), index("sale_return_created_idx").on(t.createdAt)],
);

export const saleReturnItem = pgTable("sale_return_item", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id")
    .notNull()
    .references(() => saleReturn.id, { onDelete: "cascade" }),
  saleItemId: integer("sale_item_id")
    .notNull()
    .references(() => saleItem.id),
  qty: integer("qty").notNull(),
  refund: integer("refund").notNull(),
  cost: integer("cost").notNull(), // qty × unit cost, for P&L
});

/** Every manual change to batch quantity outside sales, purchases and returns. */
export const stockAdjustment = pgTable(
  "stock_adjustment",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batch.id),
    productId: integer("product_id")
      .notNull()
      .references(() => product.id),
    qtyChange: integer("qty_change").notNull(), // negative = removed
    qtyBefore: integer("qty_before").notNull(),
    reason: text("reason").notNull(), // count_correction | damaged | expired | lost | found | supplier_return
    note: text("note"),
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("stock_adj_created_idx").on(t.createdAt)],
);

/** Append-only record of who did what. Never updated or deleted by the app. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id),
    action: text("action").notNull(), // e.g. "product.price_changed"
    entity: text("entity").notNull(), // e.g. "product"
    entityId: text("entity_id"),
    summary: text("summary").notNull(), // human-readable one-liner
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId)],
);
