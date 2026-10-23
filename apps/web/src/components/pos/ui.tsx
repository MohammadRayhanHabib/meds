/**
 * Small, dependency-free UI kit for the staff POS.
 * Dense and legible: tabular numbers, strong focus rings, 40px+ touch targets.
 */
import { X } from "lucide-react";
import { type ComponentProps, type ReactNode, cloneElement, isValidElement, useEffect, useId, useRef } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type BtnProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" | "lg" };
export function Btn({ variant = "primary", size = "md", className = "", ...p }: BtnProps) {
  const v = {
    primary: "bg-rx text-white hover:bg-deep",
    secondary: "border border-rule bg-white text-ink hover:bg-mint",
    danger: "bg-[#b42318] text-white hover:bg-[#8f1c13]",
    ghost: "text-ink hover:bg-mint",
  }[variant];
  const s = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" }[size];
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`}
    />
  );
}

export function Card({ className = "", ...p }: ComponentProps<"div">) {
  return <div {...p} className={`rounded-xl border border-rule bg-white ${className}`} />;
}

export function Stat({ label, value, tone = "default", hint }: { label: string; value: ReactNode; tone?: "default" | "good" | "warn" | "bad"; hint?: ReactNode }) {
  const color = { default: "text-ink", good: "text-rx", warn: "text-[#b54708]", bad: "text-[#b42318]" }[tone];
  return (
    <Card className="p-5">
      <p className="text-sm text-mute">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </Card>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "amber" | "red" | "blue"; children: ReactNode }) {
  const t = {
    neutral: "bg-paper text-mute",
    green: "bg-rx-soft text-rx",
    amber: "bg-[#fef0c7] text-[#93370d]",
    red: "bg-[#fee4e2] text-[#b42318]",
    blue: "bg-cold-soft text-cold",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
}

/**
 * Label + control. The hint sits outside <label> (so it isn't part of the field's
 * accessible name) and is linked with aria-describedby instead.
 */
export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  const hintId = useId();
  const control =
    hint && isValidElement<{ "aria-describedby"?: string }>(children)
      ? cloneElement(children, { "aria-describedby": hintId })
      : children;
  return (
    <div className={`text-sm ${className}`}>
      <label className="block">
        <span className="font-medium text-ink">{label}</span>
        <div className="mt-1">{control}</div>
      </label>
      {hint && <span id={hintId} className="mt-1 block text-xs text-mute">{hint}</span>}
    </div>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-rule bg-white px-3 text-sm text-ink outline-none placeholder:text-mute/70 focus:border-rx focus:ring-2 focus:ring-rx/20";

export function Input(p: ComponentProps<"input">) {
  return <input {...p} className={`${inputCls} ${p.className ?? ""}`} />;
}

export function Select(p: ComponentProps<"select">) {
  return <select {...p} className={`${inputCls} ${p.className ?? ""}`} />;
}

/** Accessible modal on native <dialog>. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-3xl" : "max-w-lg"} rounded-2xl border border-rule bg-white p-0 text-ink shadow-2xl backdrop:bg-deep/40`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-mint">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Table({ head, children, empty }: { head: ReactNode; children: ReactNode; empty?: boolean }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-rule bg-paper text-xs uppercase tracking-wide text-mute">{head}</thead>
        <tbody className="divide-y divide-rule tabular-nums">{children}</tbody>
      </table>
      {empty && <p className="p-10 text-center text-sm text-mute">Nothing here yet.</p>}
    </Card>
  );
}

export const th = "px-4 py-3 text-left font-semibold";
export const td = "px-4 py-3 align-middle";

export function Loading() {
  return <p className="p-10 text-center text-sm text-mute">Loading…</p>;
}
