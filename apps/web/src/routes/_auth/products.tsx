import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Barcode, ClipboardCheck, Pencil, Plus, Snowflake } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BarcodeLabels } from "@/components/pos/barcode-labels";
import { StockCountModal } from "@/components/pos/stock-tools";
import { Badge, Btn, Field, Input, Loading, Modal, PageHeader, Select, Table, td, th } from "@/components/pos/ui";
import { tk, toPoisha } from "@/lib/money";
import { roleOf } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/products")({
  component: Products,
});

type Row = NonNullable<ReturnType<typeof useProducts>["data"]>[number];
function useProducts(search: string) {
  return useQuery(trpc.pos.product.list.queryOptions({ search: search || undefined, includeInactive: true }));
}

const empty = { name: "", generic: "", strength: "", form: "Tablet", manufacturer: "", category: "", barcode: "", unit: "pcs", salePrice: "", reorderLevel: "10", rxRequired: false, storage: "ambient" as "ambient" | "cold", active: true };

function Products() {
  const isManager = roleOf(Route.useRouteContext()) === "manager";
  const [search, setSearch] = useState("");
  const q = useProducts(search);
  const [editing, setEditing] = useState<(typeof empty & { id?: number }) | null>(null);
  const [labels, setLabels] = useState<Row | null>(null);
  const [counting, setCounting] = useState<Row | null>(null);

  return (
    <>
      <PageHeader
        title="Medicines"
        description="Your product catalogue. Stock shown is sellable (non-expired) quantity."
        actions={isManager ? <Btn onClick={() => setEditing({ ...empty })}><Plus className="size-4" /> Add medicine</Btn> : undefined}
      />
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by brand, generic or barcode" className="mb-4 max-w-md" />
      {q.isLoading ? <Loading /> : (
        <Table
          empty={q.data?.length === 0}
          head={<tr><th className={th}>Medicine</th><th className={th}>Generic</th><th className={th}>Barcode</th><th className={`${th} text-right`}>Price</th><th className={`${th} text-right`}>Stock</th><th className={th}>Flags</th><th className={th}><span className="sr-only">Actions</span></th></tr>}
        >
          {q.data?.map((p) => (
            <tr key={p.id} className={p.active ? "" : "opacity-50"}>
              <td className={td}><span className="font-medium">{p.name}</span> <span className="text-mute">{p.strength} {p.form}</span>{p.manufacturer && <span className="block text-xs text-mute">{p.manufacturer}</span>}</td>
              <td className={td}>{p.generic}</td>
              <td className={`${td} font-mono text-xs`}>{p.barcode ?? <span className="text-mute">–</span>}</td>
              <td className={`${td} text-right`}>{tk(p.salePrice)}</td>
              <td className={`${td} text-right`}><Badge tone={p.stock === 0 ? "red" : p.stock <= p.reorderLevel ? "amber" : "green"}>{p.stock}</Badge></td>
              <td className={td}>
                <span className="flex gap-1.5">
                  {p.rxRequired && <Badge tone="amber">Rx</Badge>}
                  {p.storage === "cold" && <Badge tone="blue"><Snowflake className="mr-1 size-3" />Cold</Badge>}
                  {!p.active && <Badge>Inactive</Badge>}
                </span>
              </td>
              <td className={`${td} text-right`}>
                <span className="inline-flex gap-1">
                  {isManager && <Btn size="sm" variant="ghost" aria-label={`Count stock of ${p.name}`} onClick={() => setCounting(p)}><ClipboardCheck className="size-4" /></Btn>}
                  <Btn size="sm" variant="ghost" aria-label={`Barcode labels for ${p.name}`} onClick={() => setLabels(p)}><Barcode className="size-4" /></Btn>
                  {isManager && <Btn size="sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing({
                    id: p.id, name: p.name, generic: p.generic ?? "", strength: p.strength ?? "", form: p.form ?? "", manufacturer: p.manufacturer ?? "",
                    category: p.category ?? "", barcode: p.barcode ?? "", unit: p.unit, salePrice: String(p.salePrice / 100), reorderLevel: String(p.reorderLevel),
                    rxRequired: p.rxRequired, storage: p.storage as "ambient" | "cold", active: p.active,
                  })}><Pencil className="size-4" /></Btn>}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <ProductForm value={editing} onClose={() => setEditing(null)} />
      <BarcodeLabels product={labels} onClose={() => setLabels(null)} />
      <StockCountModal product={counting} onClose={() => setCounting(null)} />
    </>
  );
}

function ProductForm({ value, onClose }: { value: (typeof empty & { id?: number }) | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setF(value); }
  const done = { onSuccess: () => { qc.invalidateQueries(); toast.success("Saved"); onClose(); }, onError: (e: { message: string }) => toast.error(e.message) };
  const create = useMutation(trpc.pos.product.create.mutationOptions(done));
  const update = useMutation(trpc.pos.product.update.mutationOptions(done));
  if (!f) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;

  const set = (k: keyof typeof empty, v: string | boolean) => setF({ ...f, [k]: v });
  const price = toPoisha(f.salePrice);
  const valid = f.name.trim() && !Number.isNaN(price) && price >= 0;

  function save() {
    if (!f) return;
    const data = {
      name: f.name, generic: f.generic || undefined, strength: f.strength || undefined, form: f.form || undefined,
      manufacturer: f.manufacturer || undefined, category: f.category || undefined, barcode: f.barcode || undefined,
      unit: f.unit || "pcs", salePrice: price, reorderLevel: Number(f.reorderLevel) || 0, rxRequired: f.rxRequired, storage: f.storage,
    };
    if (f.id) update.mutate({ id: f.id, active: f.active, ...data });
    else create.mutate(data);
  }

  return (
    <Modal open onClose={onClose} title={f.id ? "Edit medicine" : "Add medicine"} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand name *"><Input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus placeholder="Napa Extend" /></Field>
        <Field label="Generic name"><Input value={f.generic} onChange={(e) => set("generic", e.target.value)} placeholder="Paracetamol" /></Field>
        <Field label="Strength"><Input value={f.strength} onChange={(e) => set("strength", e.target.value)} placeholder="665 mg" /></Field>
        <Field label="Form">
          <Select value={f.form} onChange={(e) => set("form", e.target.value)}>
            {["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Drops", "Cream", "Ointment", "Inhaler", "Suppository", "Powder", "Device", "Other"].map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Manufacturer"><Input value={f.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="Beximco Pharma" /></Field>
        <Field label="Category"><Input value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Pain management" /></Field>
        <Field label="Barcode" hint="Scan the pack barcode into this field"><Input value={f.barcode} onChange={(e) => set("barcode", e.target.value)} className="font-mono" /></Field>
        <Field label="Selling unit"><Input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs, strip, bottle" /></Field>
        <Field label="Sale price per unit (৳) *"><Input inputMode="decimal" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} /></Field>
        <Field label="Reorder level" hint="Alert when stock falls to this"><Input inputMode="numeric" value={f.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} /></Field>
        <Field label="Storage">
          <Select value={f.storage} onChange={(e) => set("storage", e.target.value)}>
            <option value="ambient">Normal (≤ 25°C)</option>
            <option value="cold">Refrigerated (2–8°C)</option>
          </Select>
        </Field>
        <div className="flex flex-col justify-end gap-3 pb-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.rxRequired} onChange={(e) => set("rxRequired", e.target.checked)} className="size-4 accent-[var(--color-rx)]" /> Prescription required (non-OTC)</label>
          {f.id && <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--color-rx)]" /> Active (can be sold)</label>}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!valid || create.isPending || update.isPending} onClick={save}>Save medicine</Btn>
      </div>
    </Modal>
  );
}
