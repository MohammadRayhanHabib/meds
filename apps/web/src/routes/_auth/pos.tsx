import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Minus, Plus, ScanLine, Snowflake, Trash2, UserPlus } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge, Btn, Card, Field, Input, Select } from "@/components/pos/ui";
import { tk, toPoisha } from "@/lib/money";
import { NewCustomerModal } from "@/components/pos/new-customer-modal";
import { trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/pos")({
  component: PosCounter,
});

type Line = { productId: number; name: string; strength: string | null; unitPrice: number; qty: number; stock: number; rxRequired: boolean; cold: boolean };

function PosCounter() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "bkash" | "nagad">("cash");
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [rx, setRx] = useState({ doctorName: "", doctorRegNo: "", note: "" });
  const [newCustomer, setNewCustomer] = useState(false);

  const results = useQuery({
    ...trpc.pos.product.list.queryOptions({ search }),
    enabled: search.trim().length >= 2,
  });
  const customers = useQuery(trpc.pos.customer.list.queryOptions());

  useEffect(() => searchRef.current?.focus(), []);

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const disc = Math.min(Number.isNaN(toPoisha(discount || "0")) ? 0 : toPoisha(discount || "0"), subtotal);
  const total = subtotal - disc;
  const paidP = paid === "" ? total : toPoisha(paid);
  const change = paidP - total;
  const needsRx = cart.some((l) => l.rxRequired);
  const hasCold = cart.some((l) => l.cold);

  function add(p: { id: number; name: string; strength: string | null; salePrice: number; stock: number; rxRequired: boolean; storage: string }) {
    if (p.stock <= 0) return toast.error(`${p.name} is out of stock (no sellable batches).`);
    setCart((c) => {
      const found = c.find((l) => l.productId === p.id);
      if (found) {
        if (found.qty + 1 > p.stock) {
          toast.error(`Only ${p.stock} in stock.`);
          return c;
        }
        return c.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...c, { productId: p.id, name: p.name, strength: p.strength, unitPrice: p.salePrice, qty: 1, stock: p.stock, rxRequired: p.rxRequired, cold: p.storage === "cold" }];
    });
    setSearch("");
    searchRef.current?.focus();
  }

  function setQty(id: number, qty: number) {
    setCart((c) => c.map((l) => (l.productId === id ? { ...l, qty: Math.max(1, Math.min(qty, l.stock)) } : l)));
  }

  /** Barcode scanners type the code then press Enter. */
  async function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !search.trim()) return;
    e.preventDefault();
    const byCode = await trpcClient.pos.product.byBarcode.query({ code: search.trim() });
    if (byCode) return add(byCode);
    const first = results.data?.[0];
    if (first && results.data?.length === 1) add(first);
  }

  const sell = useMutation(
    trpc.pos.sale.create.mutationOptions({
      onSuccess: (r) => {
        toast.success(`Sale ${r.invoiceNo} completed. Change: ${tk(r.change)}`);
        qc.invalidateQueries();
        setCart([]); setDiscount(""); setPaid(""); setRx({ doctorName: "", doctorRegNo: "", note: "" }); setCustomerId(undefined);
        navigate({ to: "/sales/$saleId", params: { saleId: String(r.id) }, search: { print: true } });
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  function checkout() {
    if (!cart.length) return;
    if (needsRx && !rx.doctorName.trim()) return toast.error("Record the prescribing doctor for prescription medicines.");
    if (Number.isNaN(paidP) || paidP < total) return toast.error("Amount received is less than the total.");
    sell.mutate({
      customerId,
      items: cart.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })),
      discount: disc,
      paid: paidP,
      paymentMethod: method,
      prescription: rx.doctorName.trim()
        ? { doctorName: rx.doctorName.trim(), doctorRegNo: rx.doctorRegNo.trim() || undefined, note: rx.note.trim() || undefined }
        : undefined,
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      {/* LEFT: search + cart */}
      <div className="min-w-0">
        <h1 className="mb-4 text-2xl font-semibold">New sale</h1>
        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-mute" aria-hidden="true" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Scan barcode or type medicine / generic name…"
            aria-label="Search medicine or scan barcode"
            className="h-14 w-full rounded-xl border border-rule bg-white pl-11 pr-4 text-base outline-none focus:border-rx focus:ring-2 focus:ring-rx/20"
          />
          {search.trim().length >= 2 && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-rule bg-white shadow-xl">
              {results.data?.length === 0 && <p className="p-4 text-sm text-mute">No medicine found. Press Enter to try as barcode.</p>}
              {results.data?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  disabled={p.stock <= 0}
                  className="flex w-full items-center justify-between gap-4 border-b border-rule px-4 py-3 text-left last:border-0 hover:bg-mint disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium">{p.name}</span> <span className="text-sm text-mute">{p.strength} {p.form}</span>
                    {p.generic && <span className="block text-xs text-mute">{p.generic}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
                    {p.rxRequired && <Badge tone="amber">Rx</Badge>}
                    {p.storage === "cold" && <Snowflake className="size-4 text-cold" aria-label="Cold storage" />}
                    <span className={p.stock <= 0 ? "text-[#b42318]" : "text-mute"}>{p.stock} in stock</span>
                    <span className="font-semibold">{tk(p.salePrice)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Card className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-rule bg-paper text-xs uppercase text-mute">
              <tr>
                <th className="px-4 py-3 text-left">Medicine</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-2 py-3"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule tabular-nums">
              {cart.map((l) => (
                <tr key={l.productId}>
                  <td className="px-4 py-3">
                    {l.name} <span className="text-mute">{l.strength}</span> {l.rxRequired && <Badge tone="amber">Rx</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">{tk(l.unitPrice)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" aria-label="Decrease" onClick={() => setQty(l.productId, l.qty - 1)} className="rounded-md border border-rule p-1.5 hover:bg-mint"><Minus className="size-3.5" /></button>
                      <input
                        aria-label={`Quantity of ${l.name}`}
                        inputMode="numeric"
                        value={l.qty}
                        onChange={(e) => setQty(l.productId, Number(e.target.value.replace(/\D/g, "")) || 1)}
                        className="h-8 w-14 rounded-md border border-rule text-center"
                      />
                      <button type="button" aria-label="Increase" onClick={() => setQty(l.productId, l.qty + 1)} className="rounded-md border border-rule p-1.5 hover:bg-mint"><Plus className="size-3.5" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{tk(l.qty * l.unitPrice)}</td>
                  <td className="px-2 py-3">
                    <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setCart((c) => c.filter((x) => x.productId !== l.productId))} className="rounded-md p-1.5 text-mute hover:bg-[#fee4e2] hover:text-[#b42318]">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cart.length === 0 && (
            <p className="p-12 text-center text-sm text-mute">Scan a barcode or search to add medicines. Stock is taken from the batch that expires first.</p>
          )}
        </Card>
        {hasCold && <p className="mt-3 flex items-center gap-2 text-sm text-cold"><Snowflake className="size-4" /> Cold-chain item in cart: hand over with an ice pack if needed.</p>}
      </div>

      {/* RIGHT: checkout */}
      <Card className="h-fit p-5 xl:sticky xl:top-8">
        <div className="flex items-end gap-2">
          <Field label="Customer / patient" className="flex-1">
            <Select value={customerId ?? ""} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Walk-in customer</option>
              {customers.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
              ))}
            </Select>
          </Field>
          <Btn variant="secondary" aria-label="Add customer" onClick={() => setNewCustomer(true)}><UserPlus className="size-4" /></Btn>
        </div>

        {needsRx && (
          <fieldset className="mt-5 rounded-xl border border-[#fedf89] bg-[#fffaeb] p-4">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-[#93370d]"><FileText className="size-4" /> Prescription required</legend>
            <div className="grid gap-3">
              <Field label="Doctor's name"><Input value={rx.doctorName} onChange={(e) => setRx({ ...rx, doctorName: e.target.value })} placeholder="Dr. …" /></Field>
              <Field label="BMDC reg. no. (optional)"><Input value={rx.doctorRegNo} onChange={(e) => setRx({ ...rx, doctorRegNo: e.target.value })} /></Field>
            </div>
          </fieldset>
        )}

        <dl className="mt-5 space-y-2 text-sm tabular-nums">
          <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{tk(subtotal)}</dd></div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mute">Discount (৳)</dt>
            <dd><Input aria-label="Discount (৳)" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-9 w-28 text-right" /></dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3 text-xl font-semibold"><dt>Total</dt><dd>{tk(total)}</dd></div>
        </dl>

        <div className="mt-5 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Payment method">
          {(["cash", "card", "bkash", "nagad"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(m)}
              className={`h-10 rounded-lg border text-sm font-semibold ${method === m ? "border-rx bg-rx text-white" : "border-rule hover:bg-mint"}`}
            >
              {{ cash: "Cash", card: "Card", bkash: "bKash", nagad: "Nagad" }[m]}
            </button>
          ))}
        </div>

        <Field label="Amount received (৳)" className="mt-4">
          <Input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={(total / 100).toFixed(2)} className="h-12 text-lg" />
        </Field>
        <p className={`mt-2 text-sm tabular-nums ${change < 0 ? "text-[#b42318]" : "text-mute"}`}>
          {change < 0 ? `Short by ${tk(-change)}` : `Change to return: ${tk(change)}`}
        </p>

        <Btn size="lg" className="mt-5 w-full" disabled={!cart.length || sell.isPending} onClick={checkout}>
          {sell.isPending ? "Completing…" : `Complete sale · ${tk(total)}`}
        </Btn>
      </Card>

      <NewCustomerModal open={newCustomer} onClose={() => setNewCustomer(false)} onCreated={(id) => { setCustomerId(id); setNewCustomer(false); }} />
    </div>
  );
}

