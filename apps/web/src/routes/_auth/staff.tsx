import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Btn, Field, Input, Loading, Modal, PageHeader, Select, Table, td, th } from "@/components/pos/ui";
import { fmtDate } from "@/lib/money";
import { requireManager } from "@/lib/roles";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/staff")({
  beforeLoad: requireManager,
  component: Staff,
});

function Staff() {
  const qc = useQueryClient();
  const { session } = Route.useRouteContext();
  const me = session.data?.user.id;
  const q = useQuery(trpc.pos.staff.list.queryOptions());
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<{ id: string; name: string } | null>(null);

  const done = (msg: string) => ({ onSuccess: () => { toast.success(msg); qc.invalidateQueries({ queryKey: trpc.pos.staff.list.queryKey() }); }, onError: (e: { message: string }) => toast.error(e.message) });
  const setRole = useMutation(trpc.pos.staff.setRole.mutationOptions(done("Role updated")));
  const setActive = useMutation(trpc.pos.staff.setActive.mutationOptions(done("Account updated")));

  return (
    <>
      <PageHeader
        title="Staff"
        description="Only managers can see this page. Public sign-up is closed; create every staff account here."
        actions={<Btn onClick={() => setAdding(true)}><Plus className="size-4" /> Add staff</Btn>}
      />
      <div className="mb-5 grid gap-3 text-sm md:grid-cols-2">
        <p className="rounded-xl border border-rule bg-white p-4"><Badge tone="green">Manager</Badge> <span className="ml-1 text-mute">Everything: prices, returns, write-offs, supplier payments, expenses, reports, staff.</span></p>
        <p className="rounded-xl border border-rule bg-white p-4"><Badge tone="blue">Cashier</Badge> <span className="ml-1 text-mute">Sell, view medicines and stock, receive stock, manage customers.</span></p>
      </div>
      {q.isLoading ? <Loading /> : (
        <Table head={<tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Added</th><th className={th} /></tr>}>
          {q.data?.map((u) => {
            const self = u.id === me;
            return (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <td className={`${td} font-medium`}>{u.name}{self && <span className="ml-2 text-xs text-mute">(you)</span>}</td>
                <td className={td}>{u.email}</td>
                <td className={td}>
                  <Select
                    aria-label={`Role for ${u.name}`}
                    value={u.role}
                    disabled={setRole.isPending}
                    onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as "manager" | "cashier" })}
                    className="h-9 w-36"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </Select>
                </td>
                <td className={td}>{u.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</td>
                <td className={td}>{fmtDate(u.createdAt)}</td>
                <td className={`${td} text-right`}>
                  <span className="inline-flex gap-1">
                    <Btn size="sm" variant="ghost" onClick={() => setResetting({ id: u.id, name: u.name })}><KeyRound className="size-4" /> Reset password</Btn>
                    {!self && (
                      <Btn
                        size="sm"
                        variant={u.active ? "secondary" : "ghost"}
                        disabled={setActive.isPending}
                        onClick={() => {
                          if (u.active && !confirm(`Deactivate ${u.name}? They will be signed out immediately.`)) return;
                          setActive.mutate({ userId: u.id, active: !u.active });
                        }}
                      >
                        {u.active ? "Deactivate" : "Reactivate"}
                      </Btn>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <AddStaff open={adding} onClose={() => setAdding(false)} />
      <ResetPassword user={resetting} onClose={() => setResetting(null)} />
    </>
  );
}

function AddStaff({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const blank = { name: "", email: "", password: "", role: "cashier" as "cashier" | "manager" };
  const [f, setF] = useState(blank);
  const create = useMutation(
    trpc.pos.staff.create.mutationOptions({
      onSuccess: () => { toast.success(`Account created. Share the password with ${f.name} privately.`); qc.invalidateQueries({ queryKey: trpc.pos.staff.list.queryKey() }); setF(blank); onClose(); },
      onError: (e) => toast.error(e.message),
    }),
  );
  return (
    <Modal open={open} onClose={onClose} title="Add staff member">
      <div className="grid gap-4">
        <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Email (used to sign in)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Temporary password" hint="At least 8 characters. Give it to them in person."><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="off" /></Field>
        <Field label="Role">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as "cashier" | "manager" })}>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
          </Select>
        </Field>
        <Btn disabled={!f.name.trim() || !f.email.includes("@") || f.password.length < 8 || create.isPending} onClick={() => create.mutate(f)}>Create account</Btn>
      </div>
    </Modal>
  );
}

function ResetPassword({ user, onClose }: { user: { id: string; name: string } | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const reset = useMutation(
    trpc.pos.staff.resetPassword.mutationOptions({
      onSuccess: () => { toast.success("Password reset. They have been signed out everywhere."); setPw(""); onClose(); },
      onError: (e) => toast.error(e.message),
    }),
  );
  return (
    <Modal open={!!user} onClose={onClose} title={`Reset password · ${user?.name ?? ""}`}>
      <Field label="New password" hint="At least 8 characters. They'll be signed out of all devices."><Input value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="off" /></Field>
      <Btn className="mt-5 w-full" disabled={pw.length < 8 || reset.isPending} onClick={() => user && reset.mutate({ userId: user.id, password: pw })}>Set new password</Btn>
    </Modal>
  );
}
