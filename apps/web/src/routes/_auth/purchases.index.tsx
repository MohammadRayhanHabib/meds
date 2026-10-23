import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Btn, Field, Input, Loading, Modal, PageHeader, Table, td, th } from "@/components/pos/ui";
import { fmtDate, tk, toPoisha } from "@/lib/money";
import { roleOf } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/purchases/")({
  component: Purchases,
});

function Purchases() {
  const isManager = roleOf(Route.useRouteContext()) === "manager";
  const qc = useQueryClient();
  const q = useQuery(trpc.pos.purchase.list.queryOptions());
  const [paying, setPaying] = useState<{ id: number; due: number } | null>(null);
  const [amount, setAmount] = useState("");
  const pay = useMutation(
    trpc.pos.purchase.pay.mutationOptions({
      onSuccess: () => { toast.success("Payment recorded"); qc.invalidateQueries(); setPaying(null); setAmount(""); },
      onError: (e) => toast.error(e.message),
    }),
  );
  const due = q.data?.reduce((s, p) => s + (p.total - p.paid), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Purchases"
        description={`Stock received from suppliers. Total supplier dues: ${tk(due)}`}
        actions={<Link to="/purchases/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-rx px-4 text-sm font-semibold text-white hover:bg-deep"><Plus className="size-4" /> Receive stock</Link>}
      />
      {q.isLoading ? <Loading /> : (
        <Table empty={q.data?.length === 0} head={<tr><th className={th}>Date</th><th className={th}>Supplier</th><th className={th}>Supplier invoice</th><th className={`${th} text-right`}>Total</th><th className={`${th} text-right`}>Paid</th><th className={th}>Status</th><th className={th} /></tr>}>
          {q.data?.map((p) => {
            const d = p.total - p.paid;
            return (
              <tr key={p.id}>
                <td className={td}>{fmtDate(p.purchaseDate)}</td>
                <td className={td}>{p.supplierName}</td>
                <td className={td}>{p.invoiceNo ?? "–"}</td>
                <td className={`${td} text-right`}>{tk(p.total)}</td>
                <td className={`${td} text-right`}>{tk(p.paid)}</td>
                <td className={td}>{d > 0 ? <Badge tone="amber">Due {tk(d)}</Badge> : <Badge tone="green">Paid</Badge>}</td>
                <td className={`${td} text-right`}>{d > 0 && isManager && <Btn size="sm" variant="secondary" onClick={() => setPaying({ id: p.id, due: d })}>Record payment</Btn>}</td>
              </tr>
            );
          })}
        </Table>
      )}
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Record supplier payment">
        <p className="text-sm text-mute">Outstanding: {tk(paying?.due)}</p>
        <Field label="Amount paid (৳)" className="mt-4"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
        <Btn className="mt-5 w-full" disabled={!paying || !(toPoisha(amount) > 0) || pay.isPending} onClick={() => paying && pay.mutate({ id: paying.id, amount: toPoisha(amount) })}>Save payment</Btn>
      </Modal>
    </>
  );
}
