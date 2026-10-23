import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Baby,
  BadgeCheck,
  ClipboardList,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  Pill,
  ShieldCheck,
  Snowflake,
  Syringe,
  Thermometer,
  UserRoundCheck,
  Wind,
} from "lucide-react";

import { HeroArt } from "@/components/site/hero-art";
import { Section } from "@/components/site/page-intro";
import { QualityChain } from "@/components/site/quality-chain";
import { contact, philosophy } from "@/content/site";

export const Route = createFileRoute("/_site/")({
  component: HomePage,
});

const tel = `tel:${contact.phone.replace(/\s|-/g, "")}`;

const standards = [
  { icon: ShieldCheck, label: "No open-market procurement" },
  { icon: Thermometer, label: "Storage at or below 25°C" },
  { icon: Snowflake, label: "Dedicated refrigeration" },
  { icon: UserRoundCheck, label: "Qualified pharmacy team" },
  { icon: ClipboardList, label: "Prescription compliance" },
];

const pillars = [
  {
    icon: BadgeCheck,
    title: "Genuine sourcing",
    body: "Every product comes through identifiable supply channels, checked for batch, expiry and packaging on arrival.",
  },
  {
    icon: Thermometer,
    title: "Controlled storage",
    body: "General stock kept at or below 25°C. Injections and cold-chain products live in dedicated refrigerators.",
  },
  {
    icon: UserRoundCheck,
    title: "Qualified people",
    body: "A trained pharmacy team that explains directions for use and refers you to a physician when needed.",
  },
];

const stops = [
  { icon: Pill, title: "Everyday & OTC medicines", tone: "bg-mint" },
  { icon: HeartPulse, title: "Heart & diabetes care", tone: "bg-[#fdf1dc]" },
  { icon: Syringe, title: "Injections & cold-chain", tone: "bg-cold-soft" },
  { icon: Wind, title: "Respiratory care", tone: "bg-cold-soft" },
  { icon: Baby, title: "Children & women's health", tone: "bg-mint" },
  { icon: ShieldCheck, title: "Vitamins & first aid", tone: "bg-[#fdf1dc]" },
];

function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="px-3 pt-3 md:px-5 md:pt-5">
        <div className="photo-slot mx-auto max-w-[88rem] overflow-hidden rounded-[2rem]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:py-20 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-rx shadow-sm">
                <span className="size-2 rounded-full bg-[#1f9d55]" aria-hidden="true" />
                Open today · Kachukhet Bazar, Dhaka Cantonment
              </span>
              <h1 className="mt-6 text-[2.7rem] font-semibold leading-[1.04] sm:text-6xl lg:text-[4.1rem]">
                Genuine medicine, stored <span className="accent-italic">right</span>, served with care.
              </h1>
              <p className="prose-measure mt-6 text-lg leading-relaxed text-mute">
                QSI Medicine is a professionally managed pharmacy under Quality Supply International.
                Traceable sourcing, temperature-controlled storage and a qualified team, at a fair
                price.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href={`https://wa.me/${contact.whatsapp}`}
                  className="inline-flex items-center gap-2 rounded-full bg-rx px-7 py-3.5 font-semibold text-white shadow-md hover:bg-deep"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Check if a medicine is in stock
                </a>
                <Link
                  to="/quality"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-ink shadow-sm hover:bg-mint"
                >
                  How we ensure quality
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="aspect-[12/13] rounded-[2rem] bg-white/70 p-4 shadow-[0_30px_60px_-30px_rgba(13,42,51,0.45)]">
                <HeroArt />
              </div>
              <div className="absolute -left-4 top-10 rounded-2xl bg-white px-4 py-3 shadow-lg md:-left-10">
                <p className="text-xs text-mute">General storage</p>
                <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-rx">≤ 25°C</p>
              </div>
              <div className="absolute -right-3 bottom-10 max-w-[13rem] rounded-2xl bg-deep px-4 py-3 text-white shadow-lg md:-right-8">
                <p className="text-sm font-semibold leading-snug">
                  We never buy medicines from the open market.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STANDARDS STRIP */}
      <section aria-label="Our standards" className="border-b border-rule">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-5">
          {standards.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm font-medium text-ink/80">
              <Icon className="size-6 shrink-0 text-rx" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* MORE THAN JUST */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <h2 className="text-4xl font-semibold leading-tight md:text-5xl">
            More than <span className="accent-italic">just</span> a medicine shop.
          </h2>
          <div>
            <p className="text-lg leading-relaxed text-mute">
              Medicine affects health and families directly, so we treat every sale as a
              responsibility. We check what we buy, store it the way the manufacturer requires, and
              price it fairly. That is what <em>{philosophy.replace(".", "")}</em> means to us.
            </p>
            <Link
              to="/about"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 font-semibold hover:border-ink"
            >
              Read our story
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-3xl border border-rule bg-white p-8 transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(13,42,51,0.35)]">
              <span className="grid size-14 place-items-center rounded-full bg-mint text-rx">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold">{title}</h3>
              <p className="mt-3 leading-relaxed text-mute">{body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* YOUR STOP FOR */}
      <Section
        tone="paper"
        title={
          <>
            We are your stop <span className="accent-italic">for</span>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stops.map(({ icon: Icon, title, tone }) => (
            <Link
              key={title}
              to="/medicines"
              className={`group flex min-h-44 flex-col justify-between rounded-3xl ${tone} p-7 transition-transform hover:-translate-y-1`}
            >
              <Icon className="size-8 text-ink/80" aria-hidden="true" />
              <span className="flex items-end justify-between gap-4">
                <span className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
                  {title}
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white transition-colors group-hover:bg-rx group-hover:text-white">
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-sm text-mute">
          Prescription medicines are supplied only against a valid prescription from a registered
          physician.
        </p>
      </Section>

      {/* COMMITMENT BAND */}
      <section className="px-3 md:px-5">
        <div className="mx-auto max-w-[88rem] rounded-[2rem] bg-deep text-white">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
              <h2 className="text-4xl font-semibold leading-tight md:text-5xl">
                Your health, <span className="italic text-sun">our commitment.</span>
              </h2>
              <p className="text-lg text-white/70">
                Seven checks every product passes on its way from supplier to your hands.
              </p>
            </div>
            <div className="mt-14">
              <QualityChain dark />
            </div>
          </div>
        </div>
      </section>

      {/* CONNECT */}
      <Section
        title={
          <>
            Connect <span className="accent-italic">with us</span>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="grid gap-4">
            <ContactCard icon={<MapPin className="size-5" />} title="Visit the pharmacy">
              {contact.addressLines.join(", ")}
            </ContactCard>
            <ContactCard icon={<Phone className="size-5" />} title="Call">
              <a href={tel} className="hover:text-rx">{contact.phone}</a>
            </ContactCard>
            <ContactCard icon={<MessageCircle className="size-5" />} title="WhatsApp">
              <a href={`https://wa.me/${contact.whatsapp}`} className="hover:text-rx">
                Send the medicine name, we'll check stock
              </a>
            </ContactCard>
            <div className="rounded-3xl bg-mint p-6">
              <p className="text-sm font-semibold">Opening hours</p>
              <dl className="mt-2 space-y-1">
                {contact.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4">
                    <dt>{h.days}</dt>
                    <dd className="text-mute">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <iframe
            title="Map showing QSI Medicine near Kachukhet Bazar"
            src={contact.mapEmbed}
            className="min-h-[380px] w-full rounded-3xl border border-rule"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="mt-10 border-t border-rule pt-6 text-xs leading-relaxed text-mute">
          Information on this website is general and is not a substitute for professional medical
          advice. QSI Medicine does not encourage self-medication. In an emergency, seek medical help
          immediately.
        </p>
      </Section>
    </>
  );
}

function ContactCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-3xl border border-rule p-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-rx text-white" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-mute">{children}</p>
      </div>
    </div>
  );
}
