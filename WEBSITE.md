# QSI Medicine — Public Website (Phase 1)

Built on Better-T-Stack (TanStack Router + Hono + tRPC + Better Auth + Drizzle/Postgres, Bun, Turborepo, PWA).

## Run
```bash
bun install
bun run dev:web      # http://localhost:3001
```

## Database (Neon)
Scaffolded with `--db-setup none` so it runs without a Neon account. To connect Neon:
```bash
bunx neonctl@latest init   # or create a project at neon.tech
# put the connection string in apps/server/.env -> DATABASE_URL=...
bun run db:push
```

## Where things live (apps/web/src)
| Path | Purpose |
|---|---|
| `content/site.ts` | **All website copy** (from client doc). Edit here, not in pages. |
| `routes/_site/*` | Public pages: `/`, `/about`, `/quality`, `/services`, `/medicines`, `/team`, `/faq`, `/contact` |
| `routes/_site/route.tsx` | Public layout (header, footer, skip link) |
| `routes/login.tsx`, `routes/_auth/*` | Staff sign-in + protected area — **POS goes here next phase** |
| `components/site/*` | Site components (header, footer, quality chain, disclaimer) |
| `index.css` | Design tokens (`@theme`): ink, rx green, cold blue, paper, rule, mute |

## Before launch — TODO(client)
Search the code for `TODO(client)`:
- Real phone, WhatsApp, email, Facebook, opening hours (`content/site.ts`)
- Logo file (replace `components/site/logo.tsx`), management photos
- Pharmacist PCB registration numbers — **only after PCB verification**
- Exact Google Maps pin for 145 North Kafrul

## Next phase hooks
- Contact form currently opens the visitor's email app → replace with tRPC `enquiry.create` (SRS §7 Contact Enquiry)
- POS modules (SRS FR-P-01…21) under `routes/_auth/`, schema in `packages/db/src/schema/`

---

# Pharmacy POS (Phase 2)

Staff area at `/login` → `/dashboard`. All screens live in `apps/web/src/routes/_auth/`, the API in
`packages/api/src/routers/pos/`, the schema in `packages/db/src/schema/pos.ts`.

| Feature | Screen | API |
|---|---|---|
| Sales & POS billing | `/pos` | `pos.sale.create` |
| Medicine & product stock | `/products`, `/stock` | `pos.product.*`, `pos.stock.valuation` |
| Purchase & supplier | `/purchases`, `/purchases/new`, `/suppliers` | `pos.purchase.*`, `pos.supplier.*` |
| Customer & patient | `/customers` | `pos.customer.*` |
| Expiry tracking | `/stock` | `pos.stock.expiring`, `pos.stock.writeOff` |
| Batch & barcode | batches on receipt; scan at `/pos`; labels on `/products` | `pos.product.byBarcode` |
| Profit & loss | `/reports`, `/expenses` | `pos.report.summary`, `pos.expense.*` |
| Daily / monthly / yearly reports | `/reports` | `pos.report.summary` |
| Low stock & reorder alert | `/dashboard`, `/stock` | `pos.stock.lowStock` |
| Invoice & sales history | `/sales`, `/sales/:id` (A5 or 80mm print) | `pos.sale.list`, `pos.sale.get` |
| Partial returns | "Return items" on an invoice | `pos.sale.return` |
| Stock count & adjustments | Count on `/products`, Adjust + history on `/stock` | `pos.stock.count`, `pos.stock.adjust` |
| Activity log (audit trail) | `/activity` | `pos.audit.list` |

## Business rules enforced by the server
- **FEFO**: every sale takes stock from the batch that expires first.
- **Expired stock can never be sold**; receiving already-expired stock is rejected.
- **Prescription medicines** (`rxRequired`) need the prescribing doctor recorded (DGDA).
- **No overselling**, even with two counters at once (batch rows are locked during a sale).
- **Money is integer poisha** (৳1 = 100) — no rounding errors. Cost is snapshotted per sale line, so profit is exact.
- Returns go back into the exact batch they came from, or stay out of stock if opened/damaged.
- Partial-return refunds are reduced in proportion to the invoice discount; the last return refunds exactly what is left.
- Returns are booked on the day of the refund (net sales = sales − refunds).
- Every price change, return, stock adjustment, supplier payment, expense and staff change is written to the
  audit log **in the same transaction** as the change, so the log can never disagree with the data.

## Setup
```bash
bun install
# set DATABASE_URL in apps/server/.env (Neon or local Postgres)
bun run db:push          # creates POS tables
bun run dev              # web :3001 + API :3000
```
Open http://localhost:3001/login. On a brand-new database you'll see **"Create the manager account"** —
this appears only once. Every other account is created by a manager on the **Staff** page.

## Tests (need a throwaway Postgres DB — they TRUNCATE the POS tables)
```bash
DATABASE_URL=postgres://user:pass@localhost:5432/qsi_test bun test packages/api/test
```

## Roles & access
| | Manager | Cashier |
|---|---|---|
| Sell, invoices, customers, receive stock, view medicines/stock/suppliers | ✓ | ✓ |
| Add/edit medicines & prices, add/edit suppliers | ✓ | – |
| Returns, write-offs, supplier payments | ✓ | – |
| Stock valuation, reports & P/L, expenses | ✓ | – |
| Staff accounts (create, role, deactivate, reset password) | ✓ | – |

Enforced **on the server** (`managerProcedure` in `packages/api/src/index.ts`); the UI just hides what a
cashier can't use. Public sign-up is closed by a Better Auth hook (`packages/auth/src/index.ts`) except for
the very first account. Deactivating someone deletes their sessions (instant sign-out) and blocks sign-in.
The system always keeps at least one active manager.

### Upgrading a database that already has users
`bun run db:push` adds `role` and `active` columns. Existing users default to **cashier**, so promote yourself once:
```sql
update "user" set role = 'manager' where email = 'you@example.com';
```
(Neon console → SQL Editor.)

## Backups
```bash
bun run db:backup                    # → backups/qsi-backup-YYYY-MM-DD_HHMM.json.gz
bun run db:backup -- D:\QSI-Backups  # any folder (USB drive, Google Drive sync folder…)
```
Read-only and consistent (one snapshot even while selling). Copy backups **off the shop computer**.

**Daily automatic backup on Windows** (Task Scheduler → Create Basic Task → Daily, 11:30 PM → Start a program):
- Program: `C:\Users\<you>\.bun\bin\bun.exe`
- Arguments: `run db:backup -- "G:\My Drive\QSI-Backups"`
- Start in: the project folder

**Restore** (into an empty database only; it refuses to overwrite one that has staff accounts):
1. Create a new empty database (e.g. a new Neon project) and put its URL in `apps/server/.env`.
2. `bun run db:push`
3. `bun run db:restore -- path\to\qsi-backup-....json.gz`

It restores all-or-nothing and checks every table's row count before committing. Staff keep their passwords.
**Practise a restore once** before go-live so you know it works.

## Production
```bash
bun run build                 # web → apps/web/dist, API → apps/server/dist
cd apps/server && bun run start
```
Serve `apps/web/dist` from any static host (Cloudflare Pages, Netlify, Nginx) with `VITE_SERVER_URL` pointing
at the API. Set `CORS_ORIGIN` and `BETTER_AUTH_URL` to the real https addresses, and generate a new
`BETTER_AUTH_SECRET` (`openssl rand -base64 32`).

## Go-live checklist
- [ ] Real DATABASE_URL (Neon), new BETTER_AUTH_SECRET, https URLs in both .env files
- [ ] Create the manager account, then cashier accounts from Staff
- [ ] Enter medicines (barcode, price, reorder level, Rx flag, cold storage)
- [ ] Receive current shelf stock through Purchases (batch + expiry for each)
- [ ] Print a test receipt on the actual printer (A5 or 80mm setting)
- [ ] Set up the daily backup task and do one practice restore
- [ ] Pilot week: run alongside the current process and compare totals daily

## Known next steps
- Excel import for the initial medicine list
- Batch-level sale price (when manufacturers change MRP)
- Bengali interface
- Offline selling when the internet drops
