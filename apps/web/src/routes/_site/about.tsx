import { createFileRoute } from "@tanstack/react-router";

import { PageIntro, Section } from "@/components/site/page-intro";
import { contact, fullCommitment, principles, values } from "@/content/site";

export const Route = createFileRoute("/_site/about")({
  head: () => ({ meta: [{ title: "About — QSI Medicine" }] }),
  component: AboutPage,
});

const whyUs = [
  ["Quality-focused", "Medicine quality and customer safety sit at the centre of how we work."],
  ["No open-market procurement", "We do not purchase medicines from the open market."],
  ["Controlled storage", "General storage at or below 25°C, with dedicated refrigerators."],
  ["Qualified personnel", "Our pharmacy team holds the relevant professional credentials."],
  ["Reasonable pricing", "Quality Supply with Minimum Profit is how we price."],
  ["Community-oriented", "We exist to support the health of the people around us."],
] as const;

function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="About" title="A pharmacy built on service, not margin">
        <p>
          QSI Medicine operates under Quality Supply International (QSI) from{" "}
          {contact.addressLines.join(", ")}. We were set up with one aim: to make genuine, quality
          medicines available with responsible service and reasonable prices.
        </p>
      </PageIntro>

      <Section title="Our commitment" lead={<p className="italic">“{fullCommitment}”</p>}>
        <dl className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="border-t-2 border-rx pt-4">
              <dt className="font-semibold">{p.title}</dt>
              <dd className="mt-1.5 text-mute">{p.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="white" title="Why people choose QSI Medicine">
        <dl className="grid gap-px overflow-hidden rounded-3xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {whyUs.map(([t, b]) => (
            <div key={t} className="bg-white p-6">
              <dt className="font-semibold">{t}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-mute">{b}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Our values">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <div key={v.title}>
              <dt className="font-[family-name:var(--font-display)] text-2xl font-semibold text-rx">
                {v.title}
              </dt>
              <dd className="mt-1 text-mute">{v.body}</dd>
            </div>
          ))}
        </dl>
        <p className="prose-measure mt-14 border-l-4 border-rx pl-5 text-lg leading-relaxed">
          Behind every medicine purchase there is a person, a family and a health concern. That is
          why we treat medicine supply as a responsibility, not simply a transaction.
        </p>
      </Section>
    </>
  );
}
