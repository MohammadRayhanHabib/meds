import { Link } from "@tanstack/react-router";
import { ChevronDown, Clock, MapPin, Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { contact, navGroups } from "@/content/site";

import { Logo } from "./logo";

const tel = `tel:${contact.phone.replace(/\s|-/g, "")}`;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      {/* utility bar */}
      <div className="hidden bg-deep text-[13px] text-white/80 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2">
          <span className="flex items-center gap-2">
            <MapPin className="size-3.5" aria-hidden="true" />
            Kachukhet Bazar, Dhaka Cantonment
          </span>
          <span className="flex items-center gap-5">
            <span className="flex items-center gap-2">
              <Clock className="size-3.5" aria-hidden="true" />
              {contact.hours[0].days}: {contact.hours[0].time}
            </span>
            <a href={tel} className="flex items-center gap-2 hover:text-white">
              <Phone className="size-3.5" aria-hidden="true" />
              {contact.phone}
            </a>
          </span>
        </div>
      </div>

      <div className="border-b border-rule bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
          <Link to="/" aria-label="QSI Medicine home" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1 text-[15px] font-medium">
              {navGroups.map((g) =>
                "items" in g ? (
                  <Dropdown key={g.label} label={g.label} items={g.items} />
                ) : (
                  <li key={g.label}>
                    <Link
                      to={g.to}
                      className="rounded-full px-3.5 py-2 text-ink/75 hover:bg-mint hover:text-ink"
                      activeProps={{ className: "text-rx" }}
                      activeOptions={{ exact: g.to === "/" }}
                    >
                      {g.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              className="hidden rounded-full bg-rx px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep sm:inline-block"
            >
              Check availability
            </a>
            <button
              type="button"
              className="rounded-full p-2 hover:bg-mint lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-rule lg:hidden">
            <ul className="mx-auto max-w-6xl px-5 py-3">
              {navGroups.map((g) =>
                "items" in g ? (
                  <li key={g.label} className="border-b border-rule/70 py-2">
                    <span className="block py-1 text-xs font-semibold uppercase tracking-wide text-mute">
                      {g.label}
                    </span>
                    {g.items.map((it) => (
                      <Link
                        key={it.to}
                        to={it.to}
                        onClick={() => setOpen(false)}
                        className="block py-2 pl-2 text-base"
                        activeProps={{ className: "font-semibold text-rx" }}
                      >
                        {it.label}
                      </Link>
                    ))}
                  </li>
                ) : (
                  <li key={g.label} className="border-b border-rule/70">
                    <Link
                      to={g.to}
                      onClick={() => setOpen(false)}
                      className="block py-3 text-base"
                      activeProps={{ className: "font-semibold text-rx" }}
                      activeOptions={{ exact: g.to === "/" }}
                    >
                      {g.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

function Dropdown({
  label,
  items,
}: {
  label: string;
  items: ReadonlyArray<{ to: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full px-3.5 py-2 text-ink/75 hover:bg-mint hover:text-ink"
      >
        {label}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 top-full pt-2">
          <ul className="min-w-56 rounded-2xl border border-rule bg-white p-2 shadow-[0_18px_40px_-18px_rgba(13,42,51,0.35)]">
            {items.map((it) => (
              <li key={it.to}>
                <Link
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3.5 py-2.5 text-ink/80 hover:bg-mint hover:text-ink"
                  activeProps={{ className: "text-rx font-semibold" }}
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
