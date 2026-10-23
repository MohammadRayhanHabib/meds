import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Printer, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge, Btn, Field, Input, Loading, Modal } from "@/components/pos/ui";
import { contact } from "@/content/site";
import { fmtDate, fmtDateTime, tk } from "@/lib/money";
import { roleOf } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/sales/$saleId")({
  validateSearch: z.object({ print: z.boolean().optional() }),
  component: Invoice,
});

function Invoice() {
  const { saleId } = Route.useParams();
  const { print } = Route.useSearch();
  const qc = useQueryClient();
  const isManager = roleOf(Route.useRouteContext()) === "manager";
  const q = useQuery(trpc.pos.sale.get.queryOptions({ id: Number(saleId) }));
  const rets = useQuery(trpc.pos.sale.returns.queryOptions({ saleId: Number(saleId) }));
  const [refund, setRefund] = useState(false);
  const [paper, setPaper] = useState<"a5" | "80mm">(() => {
    try { return (localStorage.getItem("qsi.receipt") as "a5" | "80mm") || "a5"; } catch { return "a5"; }
  });
  const choosePaper = (v: "a5" | "80mm") => { setPaper(v); try { localStorage.setItem("qsi.receipt", v); } catch { /* ignore */ } };

  useEffect(() => {
    if (print && q.data) setTimeout(() => window.print(), 300);
  }, [print, q.data]);

  if (!q.data) return <Loading />;
  const { sale, items, customerName, customerPhone, cashier } = q.data;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/sales" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink"><ArrowLeft className="size-4" /> Sales</Link>
        <div className="flex gap-2">
          {sale.status !== "returned" && isManager && <Btn variant="secondary" onClick={() => setRefund(true)}><Undo2 className="size-4" /> Return items</Btn>}
          <div className="inline-flex rounded-lg border border-rule bg-white p-1" role="radiogroup" aria-label="Receipt paper">
            {(["a5", "80mm"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={paper === v} onClick={() => choosePaper(v)}
                className={`rounded-md px-3 text-sm font-semibold ${paper === v ? "bg-deep text-white" : "text-mute"}`}>
                {v === "a5" ? "A5 / A4" : "80mm thermal"}
              </button>
            ))}
          </div>
          <Btn onClick={() => window.print()}><Printer className="size-4" /> Print</Btn>
        </div>
      </div>

      {/* Printable receipt: fits A5 / 80mm-thermal width well */}
      <article className={`mx-auto rounded-xl border border-rule bg-white p-6 text-sm print:border-0 print:p-0 ${paper === "80mm" ? "receipt-80 max-w-[80mm]" : "max-w-md print:max-w-none"}`}>
        <header className="border-b border-dashed border-rule pb-4 text-center">
          <p className="text-lg font-bold">QSI Medicine</p>
          <p className="text-xs text-mute">A unit of Quality Supply International</p>
          <p className="mt-1 text-xs">{contact.addressLines.join(", ")}</p>
          <p className="text-xs">{contact.phone}</p>
        </header>

        <dl className="grid grid-cols-2 gap-y-1 border-b border-dashed border-rule py-3 text-xs">
          <dt className="text-mute">Invoice</dt><dd className="text-right font-semibold">{sale.invoiceNo}</dd>
          <dt className="text-mute">Date</dt><dd className="text-right">{fmtDateTime(sale.createdAt)}</dd>
          <dt className="text-mute">Customer</dt><dd className="text-right">{customerName ?? "Walk-in"}{customerPhone ? ` · ${customerPhone}` : ""}</dd>
          <dt className="text-mute">Served by</dt><dd className="text-right">{cashier ?? "–"}</dd>
          {sale.status !== "completed" && (<><dt className="text-mute">Status</dt><dd className="text-right"><Badge tone={sale.status === "returned" ? "red" : "amber"}>{sale.status === "returned" ? "Returned" : "Partly returned"}</Badge></dd></>)}
        </dl>

        {paper === "80mm" ? (
          /* Thermal: one item per block, "qty × rate … amount" on its own line */
          <ul className="mt-3 space-y-2 text-xs tabular-nums">
            {items.map((i) => (
              <li key={i.id}>
                <p className="font-medium">{i.productName} {i.strength}</p>
                <p className="flex justify-between"><span>{i.qty} × {tk(i.unitPrice)}</span><span>{tk(i.lineTotal)}</span></p>
                <p className="text-[10px] text-mute">Batch {i.batchNo} · Exp {fmtDate(i.expiryDate)}{i.qtyReturned > 0 && <span className="text-[#b42318]"> · {i.qtyReturned} returned</span>}</p>
              </li>
            ))}
          </ul>
        ) : (
        <table className="mt-3 w-full text-xs tabular-nums">
            <thead className="text-mute">
              <tr><th className="pb-1 text-left font-medium">Item</th><th className="pb-1 text-right font-medium">Qty</th><th className="pb-1 text-right font-medium">Rate</th><th className="pb-1 text-right font-medium">Amount</th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="py-1 pr-2">
                    {i.productName} {i.strength}
                    <span className="block text-[10px] text-mute">Batch {i.batchNo} · Exp {fmtDate(i.expiryDate)}</span>
                  </td>
                  <td className="py-1 text-right">{i.qty}{i.qtyReturned > 0 && <span className="block text-[10px] text-[#b42318]">−{i.qtyReturned} ret.</span>}</td>
                  <td className="py-1 text-right">{tk(i.unitPrice)}</td>
                  <td className="py-1 text-right">{tk(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <dl className="mt-3 space-y-1 border-t border-dashed border-rule pt-3 tabular-nums">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{tk(sale.subtotal)}</dd></div>
          {sale.discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>− {tk(sale.discount)}</dd></div>}
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{tk(sale.total)}</dd></div>
          <div className="flex justify-between text-xs"><dt>Paid ({{ cash: "Cash", card: "Card", bkash: "bKash", nagad: "Nagad" }[sale.paymentMethod] ?? sale.paymentMethod})</dt><dd>{tk(sale.paid)}</dd></div>
          <div className="flex justify-between text-xs"><dt>Change</dt><dd>{tk(sale.change)}</dd></div>
          {rets.data?.map(({ ret, by }) => (
            <div key={ret.id} className="flex justify-between text-xs text-[#b42318]">
              <dt>Refund {fmtDateTime(ret.createdAt)}{ret.restocked ? "" : " (not restocked)"}{paper === "a5" && by ? ` · ${by}` : ""}</dt><dd className="shrink-0 pl-2">− {tk(ret.refundAmount)}</dd>
            </div>
          ))}
        </dl>

        {sale.prescription && (
          <p className="mt-3 border-t border-dashed border-rule pt-3 text-xs">
            Prescribed by {sale.prescription.doctorName}{sale.prescription.doctorRegNo ? ` (Reg. ${sale.prescription.doctorRegNo})` : ""}
            {sale.prescription.note && <span className="block text-mute">{sale.prescription.note}</span>}
          </p>
        )}

        <footer className="mt-4 border-t border-dashed border-rule pt-3 text-center text-[11px] text-mute">
          Quality Supply with Minimum Profit. Thank you.
          <br />Medicines once sold are returned only as per pharmacy policy.
        </footer>
      </article>

      <ReturnModal open={refund} onClose={() => setRefund(false)} sale={sale} items={items} onDone={() => { setRefund(false); qc.invalidateQueries(); }} />
    </>
  );
}

type Item = { id: number; productName: string; strength: string | null; qty: number; qtyReturned: number; unitPrice: number };

function ReturnModal({ open, onClose, sale, items, onDone }: {
  open: boolean; onClose: () => void; onDone: () => void;
  sale: { id: number; invoiceNo: string; subtotal: number; total: number }; items: Item[];
}) {
  const returnable = items.filter((i) => i.qty > i.qtyReturned);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const ratio = sale.subtotal ? sale.total / sale.subtotal : 0;
  const estimate = returnable.reduce((a, i) => a + Math.round((qty[i.id] ?? 0) * i.unitPrice * ratio), 0);
  const chosen = Object.entries(qty).filter(([, n]) => n > 0).map(([id, n]) => ({ saleItemId: Number(id), qty: n }));
  const ret = useMutation(trpc.pos.sale.return.mutationOptions({
    onSuccess: (r) => { toast.success(`Refund ${tk(r.refundAmount)}${restock ? ". Items are back in stock." : "."}`); setQty({}); setReason(""); onDone(); },
    onError: (e) => toast.error(e.message),
  }));

  return (
    <Modal open={open} onClose={onClose} title={`Return items · ${sale.invoiceNo}`} wide>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs uppercase text-mute"><tr><th className="pb-2 text-left">Item</th><th className="pb-2 text-right">Sold</th><th className="pb-2 text-right">Already returned</th><th className="pb-2 text-right">Return now</th></tr></thead>
        <tbody className="divide-y divide-rule">
          {returnable.map((i) => (
            <tr key={i.id}>
              <td className="py-2">{i.productName} <span className="text-mute">{i.strength}</span></td>
              <td className="py-2 text-right">{i.qty}</td>
              <td className="py-2 text-right">{i.qtyReturned}</td>
              <td className="py-2 text-right">
                <Input aria-label={`Return quantity for ${i.productName}`} inputMode="numeric" className="ml-auto h-9 w-20 text-right"
                  value={qty[i.id] ?? ""} placeholder="0"
                  onChange={(e) => setQty({ ...qty, [i.id]: Math.min(i.qty - i.qtyReturned, Number(e.target.value.replace(/\D/g, "")) || 0) })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Btn variant="ghost" size="sm" className="mt-2" onClick={() => setQty(Object.fromEntries(returnable.map((i) => [i.id, i.qty - i.qtyReturned])))}>Select everything</Btn>

      <fieldset className="mt-4 grid gap-2 text-sm">
        <legend className="mb-1 font-medium">Can these go back on the shelf?</legend>
        <label className="flex items-start gap-2"><input type="radio" name="restock" checked={restock} onChange={() => setRestock(true)} className="mt-1" /> <span>Yes, sealed and undamaged: add back to stock</span></label>
        <label className="flex items-start gap-2"><input type="radio" name="restock" checked={!restock} onChange={() => setRestock(false)} className="mt-1" /> <span>No, opened or damaged: refund only, keep out of stock</span></label>
      </fieldset>
      <Field label="Reason" className="mt-4"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong strength dispensed" /></Field>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm">Refund to customer: <span className="text-lg font-semibold tabular-nums">{tk(estimate)}</span>{ratio < 1 && ratio > 0 && <span className="block text-xs text-mute">Reduced in proportion to the invoice discount</span>}</p>
        <Btn variant="danger" disabled={!chosen.length || reason.trim().length < 3 || ret.isPending}
          onClick={() => ret.mutate({ saleId: sale.id, items: chosen, reason, restock })}>Confirm return</Btn>
      </div>
    </Modal>
  );
}
