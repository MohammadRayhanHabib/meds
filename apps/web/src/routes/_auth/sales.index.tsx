import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge, Field, Input, Loading, PageHeader, Table, td, th } from "@/components/pos/ui";
import { fmtDateTime, tk, todayBD } from "@/lib/money";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/sales/")({
  component: SalesHistory,
});

function SalesHistory() {
  const [from, setFrom] = useState(todayBD());
  const [to, setTo] = useState(todayBD());
  const [search, setSearch] = useState("");
  const q = useQuery(trpc.pos.sale.list.queryOptions({ from: from || undefined, to: to || undefined, search: search || undefined }));
  const completed = q.data?.filter((s) => s.status !== "returned") ?? [];
  const sum = (q.data ?? []).reduce((s, x) => s + x.total - x.refunded, 0);

  return (
    <>
      <PageHeader title="Sales & invoices" description="Every completed sale, with its invoice." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Search" className="min-w-60 flex-1"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice no., customer name or phone" /></Field>
        <p className="pb-2 text-sm text-mute tabular-nums">{completed.length} sales · <span className="font-semibold text-ink">{tk(sum)}</span></p>
      </div>
      {q.isLoading ? <Loading /> : (
        <Table
          empty={q.data?.length === 0}
          head={<tr><th className={th}>Invoice</th><th className={th}>Date</th><th className={th}>Customer</th><th className={`${th} text-right`}>Items</th><th className={th}>Payment</th><th className={`${th} text-right`}>Total</th><th className={th}>Status</th></tr>}
        >
          {q.data?.map((s) => (
            <tr key={s.id} className="hover:bg-paper">
              <td className={td}><Link to="/sales/$saleId" params={{ saleId: String(s.id) }} className="font-semibold text-rx hover:underline">{s.invoiceNo}</Link></td>
              <td className={td}>{fmtDateTime(s.createdAt)}</td>
              <td className={td}>{s.customerName ?? <span className="text-mute">Walk-in</span>}</td>
              <td className={`${td} text-right`}>{s.items}</td>
              <td className={td}>{{ cash: "Cash", card: "Card", bkash: "bKash", nagad: "Nagad" }[s.paymentMethod] ?? s.paymentMethod}{s.hasRx && <> <Badge tone="amber">Rx</Badge></>}</td>
              <td className={`${td} text-right font-semibold`}>{tk(s.total)}{s.refunded > 0 && <span className="block text-xs font-normal text-[#b42318]">− {tk(s.refunded)} refunded</span>}</td>
              <td className={td}>{s.status === "returned" ? <Badge tone="red">Returned</Badge> : s.status === "partially_returned" ? <Badge tone="amber">Part returned</Badge> : <Badge tone="green">Paid</Badge>}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
