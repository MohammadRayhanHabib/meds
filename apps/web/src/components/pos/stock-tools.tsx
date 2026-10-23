import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { fmtDate } from "@/lib/money";
import { trpc } from "@/utils/trpc";

import { Btn, Field, Input, Modal, Select } from "./ui";

export const REASONS = {
  count_correction: "Stock count correction",
  damaged: "Damaged / broken",
  expired: "Expired write-off",
  lost: "Lost / missing",
  found: "Found (extra stock)",
  supplier_return: "Returned to supplier",
} as const;
type Reason = keyof typeof REASONS;

/** Physical count: enter what is actually on the shelf per batch. */
export function StockCountModal({ product, onClose }: { product: { id: number; name: string } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const batches = useQuery({ ...trpc.pos.product.batches.queryOptions({ productId: product?.id ?? 0 }), enabled: !!product });
  const [counted, setCounted] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const save = useMutation(trpc.pos.stock.count.mutationOptions({
    onSuccess: (r) => { toast.success(r.changed ? `${r.changed} batch(es) corrected` : "Count matches the system. Nothing changed."); qc.invalidateQueries(); setCounted({}); setNote(""); onClose(); },
    onError: (e) => toast.error(e.message),
  }));
  const rows = batches.data ?? [];
  const entered = rows.filter((b) => counted[b.id] !== undefined && counted[b.id] !== "");

  return (
    <Modal open={!!product} onClose={onClose} title={`Stock count · ${product?.name ?? ""}`} wide>
      <p className="mb-4 text-sm text-mute">Count each batch on the shelf and enter the number. Leave blank to skip a batch. Differences are recorded as count corrections in the activity log.</p>
      {rows.length === 0 ? <p className="text-sm text-mute">No batches with stock.</p> : (
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs uppercase text-mute"><tr><th className="pb-2 text-left">Batch</th><th className="pb-2 text-left">Expiry</th><th className="pb-2 text-right">System</th><th className="pb-2 text-right">Counted</th><th className="pb-2 text-right">Difference</th></tr></thead>
          <tbody className="divide-y divide-rule">
            {rows.map((b) => {
              const c = counted[b.id];
              const diff = c === undefined || c === "" ? null : Number(c) - b.qtyRemaining;
              return (
                <tr key={b.id}>
                  <td className="py-2 font-mono text-xs">{b.batchNo}</td>
                  <td className="py-2">{fmtDate(b.expiryDate)}</td>
                  <td className="py-2 text-right">{b.qtyRemaining}</td>
                  <td className="py-2 text-right"><Input aria-label={`Counted quantity for batch ${b.batchNo}`} inputMode="numeric" className="ml-auto h-9 w-24 text-right" value={c ?? ""} onChange={(e) => setCounted({ ...counted, [b.id]: e.target.value.replace(/\D/g, "") })} /></td>
                  <td className={`py-2 text-right font-semibold ${diff ? (diff < 0 ? "text-[#b42318]" : "text-rx") : "text-mute"}`}>{diff === null ? "" : diff > 0 ? `+${diff}` : diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Field label="Note (optional)" className="mt-4"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Month-end count" /></Field>
      <Btn className="mt-5 w-full" disabled={!entered.length || save.isPending}
        onClick={() => product && save.mutate({ productId: product.id, counts: entered.map((b) => ({ batchId: b.id, counted: Number(counted[b.id]) })), note: note || undefined })}>
        Save count
      </Btn>
    </Modal>
  );
}

/** One-off adjustment on a batch: damaged, lost, found, supplier return. */
export function AdjustModal({ target, onClose }: { target: { batchId: number; label: string; qty: number } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [dir, setDir] = useState<"remove" | "add">("remove");
  const [n, setN] = useState("");
  const [reason, setReason] = useState<Reason>("damaged");
  const [note, setNote] = useState("");
  const adj = useMutation(trpc.pos.stock.adjust.mutationOptions({
    onSuccess: () => { toast.success("Stock adjusted"); qc.invalidateQueries(); setN(""); setNote(""); onClose(); },
    onError: (e) => toast.error(e.message),
  }));
  const qty = Number(n) || 0;
  return (
    <Modal open={!!target} onClose={onClose} title={`Adjust stock · ${target?.label ?? ""}`}>
      <p className="mb-4 text-sm text-mute">Currently {target?.qty} in this batch.</p>
      <div className="grid gap-4">
        <div className="inline-flex w-fit rounded-lg border border-rule p-1" role="radiogroup" aria-label="Direction">
          {(["remove", "add"] as const).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={dir === d}
              onClick={() => { setDir(d); setReason(d === "add" ? "found" : "damaged"); }}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold ${dir === d ? "bg-rx text-white" : "text-mute"}`}>{d === "remove" ? "Remove" : "Add"}</button>
          ))}
        </div>
        <Field label="Quantity"><Input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ""))} autoFocus /></Field>
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value as Reason)}>
            {(dir === "remove" ? ["damaged", "lost", "supplier_return", "expired", "count_correction"] : ["found", "count_correction"]).map((r) => (
              <option key={r} value={r}>{REASONS[r as Reason]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" /></Field>
        <Btn disabled={!qty || adj.isPending || (dir === "remove" && qty > (target?.qty ?? 0))}
          onClick={() => target && adj.mutate({ batchId: target.batchId, qtyChange: dir === "remove" ? -qty : qty, reason, note: note || undefined })}>
          {dir === "remove" ? `Remove ${qty || ""}` : `Add ${qty || ""}`}
        </Btn>
      </div>
    </Modal>
  );
}
