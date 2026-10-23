# meds — QSI Medicine

Public website and pharmacy POS for QSI Medicine.

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, TRPC, and more.

## Routes

The web app runs at http://localhost:3001. Management pages live under the `_auth` layout and redirect to `/login` without a session. There are two roles: **manager** and **cashier**.

### Manager only

| Route | Purpose |
|---|---|
| [/reports](http://localhost:3001/reports) | Reports & profit/loss |
| [/expenses](http://localhost:3001/expenses) | Expenses |
| [/staff](http://localhost:3001/staff) | Add staff, change role, deactivate, reset password |
| [/activity](http://localhost:3001/activity) | Activity (audit) log |

### All signed-in staff (cashier + manager)

| Route | Purpose |
|---|---|
| [/dashboard](http://localhost:3001/dashboard) | Overview |
| [/pos](http://localhost:3001/pos) | New sale (POS) |
| [/sales](http://localhost:3001/sales) | Sales & invoices |
| `/sales/$saleId` | Single sale / invoice |
| [/products](http://localhost:3001/products) | Medicines |
| [/stock](http://localhost:3001/stock) | Stock & expiry |
| [/purchases](http://localhost:3001/purchases) | Purchases |
| [/purchases/new](http://localhost:3001/purchases/new) | New purchase |
| [/suppliers](http://localhost:3001/suppliers) | Suppliers |
| [/customers](http://localhost:3001/customers) | Customers |

### Public site

[/](http://localhost:3001/) · [/about](http://localhost:3001/about) · [/services](http://localhost:3001/services) · [/medicines](http://localhost:3001/medicines) · [/quality](http://localhost:3001/quality) · [/team](http://localhost:3001/team) · [/faq](http://localhost:3001/faq) · [/contact](http://localhost:3001/contact) · [/login](http://localhost:3001/login)

### API (tRPC)

All business procedures are under `pos.*`. `protectedProcedure` = any active signed-in staff; `managerProcedure` = managers only (see `packages/api/src/index.ts`).

| Router | Manager only | All staff |
|---|---|---|
| `staff` | `list`, `create`, `setRole`, `setActive`, `resetPassword` | `me` (`needsSetup` is public) |
| `product` | `create`, `update` | `list`, `byBarcode`, `batches` |
| `stock` | `writeOff`, `adjust`, `count`, `adjustments`, `valuation` | `lowStock`, `expiring` |
| `sale` | `return`, `refund` | `create`, `get`, `list`, `returns` |
| `purchase` | `pay` | `list`, `get`, `create` |
| `supplier` | `create`, `update` | `list` |
| `expense` | `list`, `create`, `remove` | — |
| `report` | `summary` | — |
| `audit` | `list` | — |
| `customer` | — | `list`, `create`, `update`, `history` |
| `dashboard` | — | `overview` |

## Local dev test accounts

For local development only. These accounts exist only in a local database. On a fresh database, the first account is created on [/login](http://localhost:3001/login) (first-time setup makes it a manager); create the cashier from [/staff](http://localhost:3001/staff).

| Role | Email | Password |
|---|---|---|
| Manager | manager@qsi.test | Mgr-f484a0e22466 |
| Cashier | cashier@qsi.test | Cash-beee16639fd7 |

## Windows notes

- Use Bun 1.4.2 (`bun upgrade`); older versions can't read `bun.lock`.
- If varlock crashes with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`, set `VARLOCK_TELEMETRY_DISABLED=1` before running scripts.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **PWA** - Progressive Web App support
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@qsi-medicine/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `bun run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Project Structure

```
qsi-medicine/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, TRPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `cd apps/web && bun run generate-pwa-assets`: Generate PWA assets

## Better Auth Schema Generation

After changing auth plugins or schema options, run `bun run auth:generate` from the project root. The script runs the Better Auth CLI through `varlock run` from the owning app directory, loading the auth instance from `src/services.ts`. Review the schema changes, then use your ORM's migration workflow to apply them.
