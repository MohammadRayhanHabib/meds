import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useState } from "react";

import { Btn, Card, Input, PageHeader, Stat, Table, td, th } from "@/components/pos/ui";
import { fmtDate, tk, todayBD } from "@/lib/money";
import { requireManager } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/reports")({
  beforeLoad: requireManager,
  component: Reports,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Reports() {
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [date, setDate] = useState(todayBD());
  const q = useQuery(trpc.pos.report.summary.queryOptions({ period, date }));
  const r = q.data;

  // fill empty buckets so the chart shows the whole period
  const buckets =
    period === "day" ? Array.from({ length: 24 }, (_, i) => i)
      : period === "month" ? Array.from({ length: new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate() }, (_, i) => i + 1)
        : Array.from({ length: 12 }, (_, i) => i + 1);
  const byBucket = new Map(r?.series.map((s) => [s.bucket, s.revenue]));
  const max = Math.max(1, ...buckets.map((b) => byBucket.get(b) ?? 0));
  const label = (b: number) => (period === "day" ? `${b}:00` : period === "month" ? String(b) : MONTHS[b - 1]);

  const title = period === "day" ? fmtDate(date) : period === "month" ? `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}` : date.slice(0, 4);

  return (
    <>
      <PageHeader
        title="Reports & profit / loss"
        description="Net sales are after discounts and refunds. Cost of goods uses each batch's actual purchase cost."
        actions={<Btn variant="secondary" onClick={() => window.print()}><Printer className="size-4" /> Print</Btn>}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <div className="inline-flex rounded-lg border border-rule bg-white p-1" role="tablist" aria-label="Period">
          {(["day", "month", "year"] as const).map((p) => (
            <button key={p} role="tab" type="button" aria-selected={period === p} onClick={() => setPeriod(p)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${period === p ? "bg-rx text-white" : "text-mute hover:text-ink"}`}>
              {p === "day" ? "Daily" : p === "month" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" aria-label="Date in period" />
      </div>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Net sales" value={tk(r?.revenue)} hint={`${r?.invoices ?? 0} invoices · ${tk(r?.discount)} discount`} />
        <Stat label="Gross profit" value={tk(r?.grossProfit)} tone="good" hint={`Margin ${r?.marginPct ?? 0}%`} />
        <Stat label="Expenses" value={tk(r?.expenses)} />
        <Stat label="Net profit / loss" value={tk(r?.netProfit)} tone={(r?.netProfit ?? 0) < 0 ? "bad" : "good"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h3 className="font-semibold">Sales by {period === "day" ? "hour" : period === "month" ? "day" : "month"}</h3>
          <div className="mt-5 flex h-48 items-end gap-[3px]" role="img" aria-label="Sales chart">
            {buckets.map((b) => {
              const v = byBucket.get(b) ?? 0;
              return (
                <div key={b} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className="rounded-t bg-rx/80 transition-colors group-hover:bg-rx" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0 }} />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-deep px-2 py-1 text-xs text-white group-hover:block">{label(b)}: {tk(v)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-mute"><span>{label(buckets[0]!)}</span><span>{label(buckets[buckets.length - 1]!)}</span></div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Profit & loss statement</h3>
          <dl className="mt-4 space-y-2 text-sm tabular-nums">
            <Row k="Gross sales" v={tk(r?.grossSales)} />
            <Row k="Less: discounts" v={`− ${tk(r?.discount)}`} />
            <Row k="Less: refunds (returns)" v={`− ${tk(r?.refunds)}`} />
            <Row k="Net sales" v={tk(r?.revenue)} strong />
            <Row k="Less: cost of goods sold" v={`− ${tk(r?.cogs)}`} />
            <Row k="Gross profit" v={tk(r?.grossProfit)} strong />
            <Row k="Less: expenses" v={`− ${tk(r?.expenses)}`} />
            <Row k="Net profit / (loss)" v={tk(r?.netProfit)} strong big />
          </dl>
          <p className="mt-4 text-xs text-mute">{r?.returns.count ?? 0} return(s) in this period. Returns are counted on the day of the refund; cost comes back only for items put back on the shelf.</p>
          <div className="mt-4 border-t border-rule pt-3 text-sm">
            <p className="font-semibold">By payment method</p>
            {r?.byMethod.map((m) => <Row key={m.method} k={m.method === "bkash" ? "bKash" : m.method[0]!.toUpperCase() + m.method.slice(1)} v={tk(m.amount)} />)}
          </div>
        </Card>
      </div>

      <h3 className="mb-3 mt-8 font-semibold">Top selling medicines</h3>
      <Table empty={r?.topProducts.length === 0} head={<tr><th className={th}>Medicine</th><th className={`${th} text-right`}>Units</th><th className={`${th} text-right`}>Sales</th><th className={`${th} text-right`}>Profit</th></tr>}>
        {r?.topProducts.map((p) => (
          <tr key={p.productId}>
            <td className={td}>{p.name} <span className="text-mute">{p.strength}</span></td>
            <td className={`${td} text-right`}>{p.qty}</td>
            <td className={`${td} text-right`}>{tk(p.revenue)}</td>
            <td className={`${td} text-right text-rx`}>{tk(p.profit)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function Row({ k, v, strong, big }: { k: string; v: string; strong?: boolean; big?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-rule pt-2 font-semibold" : ""} ${big ? "text-base" : ""}`}>
      <dt className={strong ? "" : "text-mute"}>{k}</dt><dd>{v}</dd>
    </div>
  );
}
