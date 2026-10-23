import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Snowflake } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdjustModal, REASONS } from "@/components/pos/stock-tools";
import { Badge, Btn, Loading, PageHeader, Select, Stat, Table, td, th } from "@/components/pos/ui";
import { fmtDate, fmtDateTime, tk } from "@/lib/money";
import { roleOf } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/stock")({
  component: Stock,
});

function Stock() {
  const qc = useQueryClient();
  const [days, setDays] = useState(90);
  const [tab, setTab] = useState<"expiry" | "low" | "history">("expiry");
  const [adjusting, setAdjusting] = useState<{ batchId: number; label: string; qty: number } | null>(null);
  const isManager = roleOf(Route.useRouteContext()) === "manager";
  const val = useQuery({ ...trpc.pos.stock.valuation.queryOptions(), enabled: isManager });
  const exp = useQuery(trpc.pos.stock.expiring.queryOptions({ days }));
  const low = useQuery(trpc.pos.stock.lowStock.queryOptions());
  const history = useQuery({ ...trpc.pos.stock.adjustments.queryOptions(), enabled: isManager && tab === "history" });
  const writeOff = useMutation(
    trpc.pos.stock.writeOff.mutationOptions({
      onSuccess: () => { toast.success("Batch written off"); qc.invalidateQueries(); },
      onError: (e) => toast.error(e.message),
    }),
  );

  return (
    <>
      <PageHeader title="Stock & expiry" description={isManager ? "Expired batches are never sold by the POS. Write them off once physically removed." : "Expired batches are never sold by the POS. Tell a manager so they can be written off."} />
      {isManager && <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sellable units" value={val.data?.units.toLocaleString("en-IN") ?? "–"} />
        <Stat label="Stock value at cost" value={tk(val.data?.atCost)} />
        <Stat label="Stock value at sale price" value={tk(val.data?.atSale)} tone="good" />
        <Stat label="Expired stock (cost)" value={tk(val.data?.expiredAtCost)} tone={val.data?.expiredAtCost ? "bad" : "default"} />
      </div>}

      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-rule bg-white p-1" role="tablist">
          {([["expiry", "Expiry tracking"], ["low", `Low stock (${low.data?.length ?? 0})`], ...(isManager ? [["history", "Adjustment history"]] as const : [])] as const).map(([k, l]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-rx text-white" : "text-mute hover:text-ink"}`}>{l}</button>
          ))}
        </div>
        {tab === "expiry" && (
          <label className="flex items-center gap-2 text-sm">Show batches expiring within
            <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-32">
              {[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
            </Select>
          </label>
        )}
      </div>

      {tab === "expiry" ? (
        exp.isLoading ? <Loading /> : (
          <Table empty={exp.data?.length === 0} head={<tr><th className={th}>Medicine</th><th className={th}>Batch</th><th className={th}>Supplier</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Value (cost)</th><th className={th}>Expiry</th><th className={th} /></tr>}>
            {exp.data?.map((b) => (
              <tr key={b.id} className={b.daysLeft < 0 ? "bg-[#fef3f2]" : ""}>
                <td className={td}>{b.productName} <span className="text-mute">{b.strength}</span> {b.storage === "cold" && <Snowflake className="inline size-3.5 text-cold" aria-label="Cold" />}</td>
                <td className={`${td} font-mono text-xs`}>{b.batchNo}</td>
                <td className={td}>{b.supplierName ?? "–"}</td>
                <td className={`${td} text-right`}>{b.qtyRemaining}</td>
                <td className={`${td} text-right`}>{tk(b.qtyRemaining * b.costPrice)}</td>
                <td className={td}>
                  {fmtDate(b.expiryDate)}{" "}
                  <Badge tone={b.daysLeft < 0 ? "red" : b.daysLeft <= 30 ? "amber" : "neutral"}>{b.daysLeft < 0 ? `Expired ${-b.daysLeft}d ago` : `${b.daysLeft} days`}</Badge>
                </td>
                <td className={`${td} text-right`}>
                  {isManager && b.daysLeft >= 0 && (
                    <Btn size="sm" variant="ghost" onClick={() => setAdjusting({ batchId: b.id, label: `${b.productName} · ${b.batchNo}`, qty: b.qtyRemaining })}>Adjust</Btn>
                  )}
                  {b.daysLeft < 0 && isManager && (
                    <Btn size="sm" variant="danger" disabled={writeOff.isPending} onClick={() => { if (confirm(`Write off ${b.qtyRemaining} × ${b.productName} (batch ${b.batchNo})?`)) writeOff.mutate({ batchId: b.id }); }}>Write off</Btn>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )
      ) : tab === "history" ? (
        history.isLoading ? <Loading /> : (
          <Table empty={history.data?.length === 0} head={<tr><th className={th}>When</th><th className={th}>Medicine / batch</th><th className={th}>Reason</th><th className={`${th} text-right`}>Change</th><th className={`${th} text-right`}>Value (cost)</th><th className={th}>By</th></tr>}>
            {history.data?.map((a) => (
              <tr key={a.id}>
                <td className={td}>{fmtDateTime(a.createdAt)}</td>
                <td className={td}>{a.productName} <span className="text-mute">{a.strength}</span><span className="block font-mono text-xs text-mute">{a.batchNo}</span></td>
                <td className={td}>{REASONS[a.reason as keyof typeof REASONS] ?? a.reason}{a.note && <span className="block text-xs text-mute">{a.note}</span>}</td>
                <td className={`${td} text-right font-semibold ${a.qtyChange < 0 ? "text-[#b42318]" : "text-rx"}`}>{a.qtyChange > 0 ? "+" : ""}{a.qtyChange}<span className="block text-xs font-normal text-mute">{a.qtyBefore} → {a.qtyBefore + a.qtyChange}</span></td>
                <td className={`${td} text-right`}>{tk(a.qtyChange * a.costPrice)}</td>
                <td className={td}>{a.by ?? "–"}</td>
              </tr>
            ))}
          </Table>
        )
      ) : low.isLoading ? <Loading /> : (
        <Table empty={low.data?.length === 0} head={<tr><th className={th}>Medicine</th><th className={`${th} text-right`}>Sellable stock</th><th className={`${th} text-right`}>Reorder level</th><th className={`${th} text-right`}>Suggested order</th></tr>}>
          {low.data?.map((p) => (
            <tr key={p.id}>
              <td className={td}>{p.name} <span className="text-mute">{p.strength}</span></td>
              <td className={`${td} text-right`}><Badge tone={p.stock === 0 ? "red" : "amber"}>{p.stock}</Badge></td>
              <td className={`${td} text-right`}>{p.reorderLevel}</td>
              <td className={`${td} text-right font-semibold`}>{Math.max(p.reorderLevel * 2 - p.stock, 1)}</td>
            </tr>
          ))}
        </Table>
      )}
      <AdjustModal target={adjusting} onClose={() => setAdjusting(null)} />
    </>
  );
}
