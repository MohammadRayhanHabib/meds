import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  X,
  Building2,
  UserCog,
  History,
} from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { roleOf } from "@/lib/roles";

export const Route = createFileRoute("/_auth")({
  component: PosLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "New sale", icon: ShoppingCart },
  { to: "/sales", label: "Sales & invoices", icon: ReceiptText },
  { to: "/products", label: "Medicines", icon: Package },
  { to: "/stock", label: "Stock & expiry", icon: Boxes },
  { to: "/purchases", label: "Purchases", icon: Truck },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports & P/L", icon: BarChart3, manager: true },
  { to: "/expenses", label: "Expenses", icon: Wallet, manager: true },
  { to: "/staff", label: "Staff", icon: UserCog, manager: true },
  { to: "/activity", label: "Activity log", icon: History, manager: true },
] as const;

function PosLayout() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = roleOf({ session });
  const items = nav.filter((n) => !("manager" in n) || role === "manager");

  const signOut = () =>
    authClient.signOut({ fetchOptions: { onSuccess: () => navigate({ to: "/login" }) } });

  const sidebar = (
    <nav aria-label="POS" className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-lg bg-rx text-white">
          <svg viewBox="0 0 32 32" className="size-5" aria-hidden="true">
            <path d="M13 5h6v8h8v6h-8v8h-6v-8H5v-6h8z" fill="currentColor" />
          </svg>
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-white">QSI Medicine</span>
          <span className="block text-xs text-white/60">Pharmacy POS</span>
        </span>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "bg-white/15 !text-white font-semibold" }}
            >
              <Icon className="size-4.5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{session.data?.user.name}</p>
        <span className="mt-1 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">{role}</span>
        <p className="truncate text-xs text-white/55">{session.data?.user.email}</p>
        <div className="mt-3 flex gap-2">
          <Link to="/" className="rounded-lg px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10">
            Website
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            <LogOut className="size-3.5" aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="pos flex min-h-svh bg-paper text-ink">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 bg-deep lg:block print:hidden">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-deep/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 bg-deep">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-5 text-white">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-rule bg-white px-4 py-3 lg:hidden print:hidden">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-mint">
            <Menu className="size-5" />
          </button>
          <span className="font-semibold">QSI Medicine POS</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
