import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ShoppingCart, Truck } from "lucide-react";

import { Badge, Card, PageHeader, Stat, td, th } from "@/components/pos/ui";
import { fmtDate, tk } from "@/lib/money";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { session } = Route.useRouteContext();
  const overview = useQuery(trpc.pos.dashboard.overview.queryOptions());
  const low = useQuery(trpc.pos.stock.lowStock.queryOptions());
  const expiring = useQuery(trpc.pos.stock.expiring.queryOptions({ days: 30 }));
  const o = overview.data;

  return (
    <>
      <PageHeader
        title={`Good day, ${session.data?.user.name?.split(" ")[0] ?? ""}`}
        description={o ? `Today, ${fmtDate(o.today)}` : undefined}
        actions={
          <>
            <Link to="/purchases/new" className="inline-flex h-10 items-center gap-2 rounded-lg border border-rule bg-white px-4 text-sm font-semibold hover:bg-mint">
              <Truck className="size-4" /> Receive stock
            </Link>
            <Link to="/pos" className="inline-flex h-10 items-center gap-2 rounded-lg bg-rx px-4 text-sm font-semibold text-white hover:bg-deep">
              <ShoppingCart className="size-4" /> New sale
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today's sales" value={tk(o?.todayRevenue)} tone="good" hint={`${o?.todayInvoices ?? 0} invoices`} />
        <Stat label="Low stock items" value={o?.lowStock ?? "–"} tone={o?.lowStock ? "warn" : "default"} hint="At or below reorder level" />
        <Stat label="Expiring in 30 days" value={o?.expiringIn30 ?? "–"} tone={o?.expiringIn30 ? "warn" : "default"} hint="Batches with stock" />
        <Stat label="Expired on shelf" value={o?.expiredWithStock ?? "–"} tone={o?.expiredWithStock ? "bad" : "default"} hint="Remove and write off" />
      </div>

      {o?.expiredWithStock ? (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-[#fda29b] bg-[#fef3f2] p-4 text-sm text-[#912018]">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>
            {o.expiredWithStock} expired batch{o.expiredWithStock > 1 ? "es are" : " is"} still on the shelf. The POS blocks their
            sale; remove {o.expiredWithStock > 1 ? "them" : "it"} physically and write {o.expiredWithStock > 1 ? "them" : "it"} off.{" "}
            <Link to="/stock" className="font-semibold underline">Review expired stock</Link>
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <h2 className="font-semibold">Reorder list</h2>
            <Link to="/stock" className="text-sm font-semibold text-rx">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-mute">
              <tr><th className={th}>Medicine</th><th className={`${th} text-right`}>In stock</th><th className={`${th} text-right`}>Reorder at</th></tr>
            </thead>
            <tbody className="divide-y divide-rule tabular-nums">
              {low.data?.slice(0, 8).map((p) => (
                <tr key={p.id}>
                  <td className={td}>{p.name} <span className="text-mute">{p.strength}</span></td>
                  <td className={`${td} text-right`}><Badge tone={p.stock === 0 ? "red" : "amber"}>{p.stock}</Badge></td>
                  <td className={`${td} text-right text-mute`}>{p.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {low.data?.length === 0 && <p className="p-6 text-sm text-mute">All medicines are above their reorder level.</p>}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <h2 className="font-semibold">Expiring soon</h2>
            <Link to="/stock" className="text-sm font-semibold text-rx">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-mute">
              <tr><th className={th}>Medicine / batch</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Expiry</th></tr>
            </thead>
            <tbody className="divide-y divide-rule tabular-nums">
              {expiring.data?.slice(0, 8).map((b) => (
                <tr key={b.id}>
                  <td className={td}>{b.productName} <span className="text-mute">· {b.batchNo}</span></td>
                  <td className={`${td} text-right`}>{b.qtyRemaining}</td>
                  <td className={`${td} text-right`}>
                    <Badge tone={b.daysLeft < 0 ? "red" : "amber"}>{b.daysLeft < 0 ? "Expired" : `${b.daysLeft} days`}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expiring.data?.length === 0 && <p className="p-6 text-sm text-mute">No batches expire in the next 30 days.</p>}
        </Card>
      </div>
    </>
  );
}
