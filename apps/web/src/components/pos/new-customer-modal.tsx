import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Btn, Field, Input, Modal } from "./ui";

export function NewCustomerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", phone: "", address: "" });
  const create = useMutation(
    trpc.pos.customer.create.mutationOptions({
      onSuccess: (c) => { qc.invalidateQueries({ queryKey: trpc.pos.customer.list.queryKey() }); toast.success("Customer added"); setF({ name: "", phone: "", address: "" }); onCreated(c.id); },
      onError: (e) => toast.error(e.message),
    }),
  );
  return (
    <Modal open={open} onClose={onClose} title="New customer">
      <div className="grid gap-4">
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
        <Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Btn disabled={!f.name.trim() || create.isPending} onClick={() => create.mutate(f)}>Save customer</Btn>
      </div>
    </Modal>
  );
}
