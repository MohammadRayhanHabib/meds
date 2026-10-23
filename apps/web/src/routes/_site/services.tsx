import { Link, createFileRoute } from "@tanstack/react-router";

import { Disclaimer } from "@/components/site/disclaimer";
import { PageIntro, Section } from "@/components/site/page-intro";
import { services } from "@/content/site";

export const Route = createFileRoute("/_site/services")({
  head: () => ({ meta: [{ title: "Services — QSI Medicine" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <>
      <PageIntro eyebrow="Services" title="What we do for you">
        <p>
          Genuine medicines, careful handling and honest help at the counter. Prescription
          medicines are supplied only against a valid prescription.
        </p>
      </PageIntro>
      <Section>
        <dl className="divide-y divide-rule border-y border-rule">
          {services.map((s) => (
            <div key={s.title} className="grid gap-2 py-6 md:grid-cols-[18rem_1fr] md:gap-10">
              <dt className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {s.title}
              </dt>
              <dd className="prose-measure leading-relaxed text-mute">{s.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10">
          Need something specific?{" "}
          <Link to="/contact" className="font-semibold text-rx underline underline-offset-4">
            Contact us to check availability
          </Link>
          .
        </p>
      </Section>
      <div className="mx-auto max-w-6xl px-5 pb-20">
        <Disclaimer />
      </div>
    </>
  );
}
