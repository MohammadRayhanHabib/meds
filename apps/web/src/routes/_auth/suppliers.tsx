import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Btn, Field, Input, Loading, Modal, PageHeader, Table, td, th } from "@/components/pos/ui";
import { roleOf } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/suppliers")({
  component: Suppliers,
});

type F = { id?: number; name: string; contactPerson: string; phone: string; address: string; notes: string; active: boolean };
const blank: F = { name: "", contactPerson: "", phone: "", address: "", notes: "", active: true };

function Suppliers() {
  const isManager = roleOf(Route.useRouteContext()) === "manager";
  const qc = useQueryClient();
  const q = useQuery(trpc.pos.supplier.list.queryOptions());
  const [f, setF] = useState<F | null>(null);
  const done = { onSuccess: () => { qc.invalidateQueries(); toast.success("Saved"); setF(null); }, onError: (e: { message: string }) => toast.error(e.message) };
  const create = useMutation(trpc.pos.supplier.create.mutationOptions(done));
  const update = useMutation(trpc.pos.supplier.update.mutationOptions(done));

  return (
    <>
      <PageHeader title="Suppliers" description="Only identifiable, authorised supply channels. No open-market purchasing." actions={isManager ? <Btn onClick={() => setF({ ...blank })}><Plus className="size-4" /> Add supplier</Btn> : undefined} />
      {q.isLoading ? <Loading /> : (
        <Table empty={q.data?.length === 0} head={<tr><th className={th}>Supplier</th><th className={th}>Contact</th><th className={th}>Phone</th><th className={th}>Address</th><th className={th} /></tr>}>
          {q.data?.map((s) => (
            <tr key={s.id} className={s.active ? "" : "opacity-50"}>
              <td className={td}><span className="font-medium">{s.name}</span> {!s.active && <Badge>Inactive</Badge>}</td>
              <td className={td}>{s.contactPerson ?? "–"}</td>
              <td className={td}>{s.phone ?? "–"}</td>
              <td className={td}>{s.address ?? "–"}</td>
              <td className={`${td} text-right`}>{isManager && <Btn size="sm" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => setF({ id: s.id, name: s.name, contactPerson: s.contactPerson ?? "", phone: s.phone ?? "", address: s.address ?? "", notes: s.notes ?? "", active: s.active })}><Pencil className="size-4" /></Btn>}</td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? "Edit supplier" : "Add supplier"}>
        {f && (
          <div className="grid gap-4">
            <Field label="Company / distributor *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
            <Field label="Contact person (MPO / rep)"><Input value={f.contactPerson} onChange={(e) => setF({ ...f, contactPerson: e.target.value })} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
            <Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <Field label="Notes"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Order day, credit terms…" /></Field>
            {f.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-4" /> Active</label>}
            <Btn disabled={!f.name.trim() || create.isPending || update.isPending} onClick={() => {
              const { id, active, ...d } = f;
              if (id) update.mutate({ id, active, ...d }); else create.mutate(d);
            }}>Save supplier</Btn>
          </div>
        )}
      </Modal>
    </>
  );
}
