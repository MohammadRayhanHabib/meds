import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Btn, Field, Input } from "@/components/pos/ui";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const s = await authClient.getSession();
    if (s.data) throw redirect({ to: "/dashboard" });
  },
  component: Login,
});

function Login() {
  const setup = useQuery(trpc.pos.staff.needsSetup.queryOptions());
  const firstRun = setup.data === true;

  return (
    <div className="pos grid min-h-svh bg-paper lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-deep p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-lg bg-rx">
            <svg viewBox="0 0 32 32" className="size-5" aria-hidden="true"><path d="M13 5h6v8h8v6h-8v8h-6v-8H5v-6h8z" fill="currentColor" /></svg>
          </span>
          <span className="font-semibold">QSI Medicine</span>
        </Link>
        <div>
          <p className="font-[family-name:var(--font-display)] text-4xl leading-tight">Quality Supply with Minimum Profit.</p>
          <p className="mt-4 max-w-sm text-white/65">Pharmacy POS for counter staff and management.</p>
        </div>
        <p className="text-xs text-white/45">Staff access only. Accounts are created by a manager.</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {setup.isLoading ? (
            <p className="text-center text-sm text-mute">Loading…</p>
          ) : firstRun ? (
            <FirstManager />
          ) : (
            <SignIn />
          )}
        </div>
      </main>
    </div>
  );
}

function SignIn() {
  const navigate = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await authClient.signIn.email(f, {
      onSuccess: () => navigate({ to: "/dashboard" }),
      onError: (err) => { toast.error(err.error.message || "Could not sign in"); },
    });
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">Staff sign in</h1>
        <p className="mt-1 text-sm text-mute">Use the email and password your manager gave you.</p>
      </div>
      <Field label="Email"><Input name="email" type="email" autoComplete="username" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoFocus /></Field>
      <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Btn type="submit" size="lg" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Btn>
      <p className="text-xs text-mute">Forgot your password? Ask a manager to reset it from the Staff page.</p>
    </form>
  );
}

/** Shown only while the system has zero accounts. The server makes this account a manager. */
function FirstManager() {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const mismatch = f.confirm.length > 0 && f.password !== f.confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (f.password !== f.confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    await authClient.signUp.email(
      { name: f.name, email: f.email, password: f.password },
      {
        onSuccess: () => { toast.success("Manager account created"); navigate({ to: "/dashboard" }); },
        onError: (err) => { toast.error(err.error.message || "Could not create account"); },
      },
    );
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="mb-2">
        <span className="inline-block rounded-full bg-rx-soft px-3 py-1 text-xs font-semibold text-rx">First-time setup</span>
        <h1 className="mt-3 text-2xl font-semibold">Create the manager account</h1>
        <p className="mt-1 text-sm text-mute">
          This page appears only once. After this, sign-up is closed and staff accounts are created from the Staff page.
        </p>
      </div>
      <Field label="Full name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
      <Field label="Email"><Input type="email" autoComplete="username" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Field label="Confirm password"><Input type="password" autoComplete="new-password" required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} aria-invalid={mismatch} /></Field>
      {mismatch && <p className="-mt-2 text-xs text-[#b42318]">Passwords do not match.</p>}
      <Btn type="submit" size="lg" disabled={busy || mismatch}>{busy ? "Creating…" : "Create manager account"}</Btn>
    </form>
  );
}
