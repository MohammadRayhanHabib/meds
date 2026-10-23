import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { History, Plus } from "lucide-react";
import { useState } from "react";

import { Badge, Btn, Input, Loading, Modal, PageHeader, Table, td, th } from "@/components/pos/ui";
import { fmtDateTime, tk } from "@/lib/money";
import { NewCustomerModal } from "@/components/pos/new-customer-modal";
import { trpc } from "@/utils/trpc";



export const Route = createFileRoute("/_auth/customers")({
  component: Customers,
});

function Customers() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);
  const q = useQuery(trpc.pos.customer.list.queryOptions({ search: search || undefined }));
  const hist = useQuery({ ...trpc.pos.customer.history.queryOptions({ customerId: viewing?.id ?? 0 }), enabled: !!viewing });

  return (
    <>
      <PageHeader title="Customers & patients" description="Regular customers and their purchase history." actions={<Btn onClick={() => setAdding(true)}><Plus className="size-4" /> Add customer</Btn>} />
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" className="mb-4 max-w-md" />
      {q.isLoading ? <Loading /> : (
        <Table empty={q.data?.length === 0} head={<tr><th className={th}>Name</th><th className={th}>Phone</th><th className={th}>Address</th><th className={`${th} text-right`}>Visits</th><th className={`${th} text-right`}>Total spent</th><th className={th} /></tr>}>
          {q.data?.map((c) => (
            <tr key={c.id}>
              <td className={`${td} font-medium`}>{c.name}</td>
              <td className={td}>{c.phone ?? "–"}</td>
              <td className={td}>{c.address ?? "–"}</td>
              <td className={`${td} text-right`}>{c.visits}</td>
              <td className={`${td} text-right`}>{tk(c.spent)}</td>
              <td className={`${td} text-right`}><Btn size="sm" variant="ghost" onClick={() => setViewing({ id: c.id, name: c.name })}><History className="size-4" /> History</Btn></td>
            </tr>
          ))}
        </Table>
      )}
      <NewCustomerModal open={adding} onClose={() => setAdding(false)} onCreated={() => setAdding(false)} />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Purchase history · ${viewing?.name ?? ""}`} wide>
        {hist.isLoading ? <Loading /> : hist.data?.length === 0 ? <p className="text-sm text-mute">No purchases yet.</p> : (
          <ul className="divide-y divide-rule text-sm">
            {hist.data?.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                <Link to="/sales/$saleId" params={{ saleId: String(s.id) }} className="font-semibold text-rx hover:underline">{s.invoiceNo}</Link>
                <span className="text-mute">{fmtDateTime(s.createdAt)}</span>
                {s.prescription && <Badge tone="amber">Rx · {s.prescription.doctorName}</Badge>}
                <span className="font-semibold tabular-nums">{tk(s.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
