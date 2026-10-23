import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Btn, Card, Field, Input, PageHeader, Select } from "@/components/pos/ui";
import { tk, toPoisha, todayBD } from "@/lib/money";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/purchases/new")({
  component: NewPurchase,
});

type Line = { productId: string; batchNo: string; expiryDate: string; qty: string; costPrice: string };
const blank: Line = { productId: "", batchNo: "", expiryDate: "", qty: "", costPrice: "" };

function NewPurchase() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const suppliers = useQuery(trpc.pos.supplier.list.queryOptions());
  const products = useQuery(trpc.pos.product.list.queryOptions({}));
  const [head, setHead] = useState({ supplierId: "", invoiceNo: "", purchaseDate: todayBD(), paid: "", note: "" });
  const [lines, setLines] = useState<Line[]>([{ ...blank }]);

  const today = todayBD();
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (toPoisha(l.costPrice || "0") || 0), 0);
  const lineError = (l: Line) =>
    !l.productId ? "Choose medicine" : !l.batchNo.trim() ? "Batch no. required" : !l.expiryDate ? "Expiry required"
      : l.expiryDate <= today ? "Already expired" : !(Number(l.qty) > 0) ? "Qty required" : Number.isNaN(toPoisha(l.costPrice)) || !l.costPrice ? "Cost required" : null;
  const errors = lines.map(lineError);
  const ok = head.supplierId && errors.every((e) => !e);

  const save = useMutation(
    trpc.pos.purchase.create.mutationOptions({
      onSuccess: () => { toast.success("Stock received. New batches added."); qc.invalidateQueries(); navigate({ to: "/purchases" }); },
      onError: (e) => toast.error(e.message),
    }),
  );

  const upd = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <>
      <Link to="/purchases" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink"><ArrowLeft className="size-4" /> Purchases</Link>
      <PageHeader title="Receive stock" description="Check batch number, expiry and packaging for every line before accepting. Expired stock is rejected." />

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Supplier *">
            <Select value={head.supplierId} onChange={(e) => setHead({ ...head, supplierId: e.target.value })}>
              <option value="">Select supplier…</option>
              {suppliers.data?.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Supplier invoice / challan no."><Input value={head.invoiceNo} onChange={(e) => setHead({ ...head, invoiceNo: e.target.value })} /></Field>
          <Field label="Received on"><Input type="date" value={head.purchaseDate} onChange={(e) => setHead({ ...head, purchaseDate: e.target.value })} /></Field>
          <Field label="Paid now (৳)"><Input inputMode="decimal" value={head.paid} onChange={(e) => setHead({ ...head, paid: e.target.value })} placeholder="0" /></Field>
        </div>
        {suppliers.data?.length === 0 && <p className="mt-3 text-sm text-[#b54708]">No suppliers yet. <Link to="/suppliers" className="font-semibold underline">Add a supplier</Link> first.</p>}
      </Card>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-rule bg-paper text-xs uppercase text-mute">
            <tr><th className="px-3 py-3 text-left">Medicine</th><th className="px-3 py-3 text-left">Batch no.</th><th className="px-3 py-3 text-left">Expiry</th><th className="px-3 py-3 text-left">Qty</th><th className="px-3 py-3 text-left">Unit cost (৳)</th><th className="px-3 py-3 text-right">Line total</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {lines.map((l, i) => (
              <tr key={i} className="align-top">
                <td className="px-3 py-2">
                  <Select value={l.productId} onChange={(e) => upd(i, "productId", e.target.value)} aria-label="Medicine">
                    <option value="">Select…</option>
                    {products.data?.map((p) => <option key={p.id} value={p.id}>{p.name} {p.strength ?? ""}</option>)}
                  </Select>
                  {errors[i] && (l.productId || l.batchNo || l.qty) && <p className="mt-1 text-xs text-[#b42318]">{errors[i]}</p>}
                </td>
                <td className="px-3 py-2"><Input value={l.batchNo} onChange={(e) => upd(i, "batchNo", e.target.value)} aria-label="Batch number" className="font-mono" /></td>
                <td className="px-3 py-2"><Input type="date" value={l.expiryDate} min={today} onChange={(e) => upd(i, "expiryDate", e.target.value)} aria-label="Expiry date" /></td>
                <td className="px-3 py-2"><Input inputMode="numeric" value={l.qty} onChange={(e) => upd(i, "qty", e.target.value.replace(/\D/g, ""))} aria-label="Quantity" className="w-24" /></td>
                <td className="px-3 py-2"><Input inputMode="decimal" value={l.costPrice} onChange={(e) => upd(i, "costPrice", e.target.value)} aria-label="Unit cost" className="w-28" /></td>
                <td className="px-3 py-2 pt-4 text-right tabular-nums">{tk((Number(l.qty) || 0) * (toPoisha(l.costPrice || "0") || 0))}</td>
                <td className="px-2 py-2"><Btn size="sm" variant="ghost" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule p-4">
          <Btn variant="secondary" onClick={() => setLines((ls) => [...ls, { ...blank }])}><Plus className="size-4" /> Add line</Btn>
          <p className="text-lg font-semibold tabular-nums">Total {tk(total)}</p>
        </div>
      </Card>

      <div className="mt-5 flex justify-end">
        <Btn
          size="lg"
          disabled={!ok || save.isPending}
          onClick={() =>
            save.mutate({
              supplierId: Number(head.supplierId),
              invoiceNo: head.invoiceNo || undefined,
              purchaseDate: head.purchaseDate,
              paid: toPoisha(head.paid || "0") || 0,
              note: head.note || undefined,
              items: lines.map((l) => ({ productId: Number(l.productId), batchNo: l.batchNo.trim(), expiryDate: l.expiryDate, qty: Number(l.qty), costPrice: toPoisha(l.costPrice) })),
            })
          }
        >
          Save & add to stock
        </Btn>
      </div>
    </>
  );
}
