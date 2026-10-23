import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, Input, Loading, PageHeader, Select, Table, td, th } from "@/components/pos/ui";
import { fmtDate, tk, toPoisha, todayBD } from "@/lib/money";
import { requireManager } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/expenses")({
  beforeLoad: requireManager,
  component: Expenses,
});

const CATEGORIES = ["Rent", "Staff salary", "Electricity", "Internet & phone", "Refrigeration / maintenance", "Transport", "Packaging", "License & fees", "Other"];

function Expenses() {
  const qc = useQueryClient();
  const q = useQuery(trpc.pos.expense.list.queryOptions());
  const [f, setF] = useState({ expenseDate: todayBD(), category: CATEGORIES[0]!, amount: "", note: "" });
  const create = useMutation(trpc.pos.expense.create.mutationOptions({
    onSuccess: () => { toast.success("Expense added"); qc.invalidateQueries(); setF({ ...f, amount: "", note: "" }); },
    onError: (e) => toast.error(e.message),
  }));
  const remove = useMutation(trpc.pos.expense.remove.mutationOptions({ onSuccess: () => qc.invalidateQueries() }));
  const amount = toPoisha(f.amount);

  return (
    <>
      <PageHeader title="Expenses" description="Running costs. These are deducted in the profit & loss report." />
      <Card className="mb-6 p-5">
        <div className="grid items-end gap-4 md:grid-cols-[160px_1fr_160px_1fr_auto]">
          <Field label="Date"><Input type="date" value={f.expenseDate} onChange={(e) => setF({ ...f, expenseDate: e.target.value })} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Amount (৳)"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <Btn disabled={!(amount > 0) || create.isPending} onClick={() => create.mutate({ ...f, amount, note: f.note || undefined })}>Add</Btn>
        </div>
      </Card>
      {q.isLoading ? <Loading /> : (
        <Table empty={q.data?.length === 0} head={<tr><th className={th}>Date</th><th className={th}>Category</th><th className={th}>Note</th><th className={`${th} text-right`}>Amount</th><th className={th} /></tr>}>
          {q.data?.map((e) => (
            <tr key={e.id}>
              <td className={td}>{fmtDate(e.expenseDate)}</td>
              <td className={td}>{e.category}</td>
              <td className={td}>{e.note ?? "–"}</td>
              <td className={`${td} text-right font-semibold`}>{tk(e.amount)}</td>
              <td className={`${td} text-right`}><Btn size="sm" variant="ghost" aria-label="Delete expense" onClick={() => confirm("Delete this expense?") && remove.mutate({ id: e.id })}><Trash2 className="size-4" /></Btn></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
