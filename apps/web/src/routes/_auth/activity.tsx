import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge, Field, Input, Loading, PageHeader, Select, Table, td, th } from "@/components/pos/ui";
import { fmtDateTime, todayBD } from "@/lib/money";
import { requireManager } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/activity")({
  beforeLoad: requireManager,
  component: Activity,
});

const AREAS = [
  ["", "Everything"],
  ["product", "Medicines & prices"],
  ["stock", "Stock adjustments"],
  ["sale", "Returns"],
  ["purchase", "Purchases & payments"],
  ["expense", "Expenses"],
  ["supplier", "Suppliers"],
  ["staff", "Staff"],
] as const;

const tone = (action: string) =>
  action.includes("price") || action.startsWith("sale.") || action.includes("deactivated") || action.includes("deleted") ? "amber"
    : action.startsWith("stock.") ? "blue" : "neutral";

function Activity() {
  const [area, setArea] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayBD());
  const staff = useQuery(trpc.pos.staff.list.queryOptions());
  const q = useQuery(trpc.pos.audit.list.queryOptions({ area: area || undefined, userId: userId || undefined, from: from || undefined, to: to || undefined }));

  return (
    <>
      <PageHeader title="Activity log" description="Who changed what, and when. Entries cannot be edited or deleted from the app." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Area"><Select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Staff member">
          <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Everyone</option>
            {staff.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {q.isLoading ? <Loading /> : (
        <Table empty={q.data?.length === 0} head={<tr><th className={th}>When</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Details</th></tr>}>
          {q.data?.map((l) => (
            <tr key={l.id}>
              <td className={`${td} whitespace-nowrap`}>{fmtDateTime(l.createdAt)}</td>
              <td className={`${td} whitespace-nowrap`}>{l.by ?? "–"}</td>
              <td className={td}><Badge tone={tone(l.action)}>{l.action.replace(".", " · ").replaceAll("_", " ")}</Badge></td>
              <td className={td}>{l.summary}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
