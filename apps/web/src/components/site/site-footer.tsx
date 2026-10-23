import { Link } from "@tanstack/react-router";
import { Globe, Mail, MapPin, Phone } from "lucide-react";

import { contact, nav, philosophy } from "@/content/site";

import { Logo } from "./logo";

const tel = `tel:${contact.phone.replace(/\s|-/g, "")}`;

export function SiteFooter() {
  return (
    <footer className="bg-deep text-white/80">
      {/* CTA band */}
      <div className="mx-auto max-w-6xl px-5 pt-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-rx px-8 py-10 md:flex-row md:items-center md:px-12">
          <div>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              Need a medicine <span className="italic">today?</span>
            </h2>
            <p className="mt-2 text-white/80">
              Message us the name and strength. We'll confirm stock before you travel.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              className="rounded-full bg-white px-6 py-3 font-semibold text-rx hover:bg-mint"
            >
              WhatsApp us
            </a>
            <a href={tel} className="rounded-full border border-white/50 px-6 py-3 font-semibold text-white hover:border-white">
              Call now
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <Logo inverted />
          <p className="mt-5 max-w-xs font-[family-name:var(--font-display)] text-xl italic text-white">
            {philosophy}
          </p>
          <a
            href={contact.facebook}
            aria-label="QSI Medicine on Facebook"
            className="mt-5 inline-grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <Globe className="size-4" />
          </a>
        </div>

        <FooterCol title="Explore" links={nav.slice(0, 4)} />
        <FooterCol title="Patients" links={nav.slice(4)} />

        <div>
          <h2 className="font-[family-name:var(--font-body)] text-sm font-semibold uppercase tracking-wider text-white">
            Connect
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden="true" />
              <span>{contact.addressLines.join(", ")}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden="true" />
              <a href={tel} className="hover:text-white">{contact.phone}</a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden="true" />
              <a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} QSI Medicine, a unit of Quality Supply International. All rights reserved.</p>
          <p className="max-w-xl md:text-right">
            Prescription medicines are supplied only in accordance with applicable Bangladesh laws.
            Website information is not a substitute for professional medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: ReadonlyArray<{ to: string; label: string }> }) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-body)] text-sm font-semibold uppercase tracking-wider text-white">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
