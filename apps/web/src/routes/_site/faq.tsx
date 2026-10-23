import { Link, createFileRoute } from "@tanstack/react-router";

import { PageIntro, Section } from "@/components/site/page-intro";
import { faqs } from "@/content/site";

export const Route = createFileRoute("/_site/faq")({
  head: () => ({ meta: [{ title: "FAQ — QSI Medicine" }] }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <>
      <PageIntro eyebrow="FAQ" title="Frequently asked questions" />
      <Section>
        <div className="max-w-3xl divide-y divide-rule border-y border-rule">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden="true"
                  className="mt-1 text-2xl leading-none text-rx transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="prose-measure mt-3 leading-relaxed text-mute">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10">
          Didn't find your answer?{" "}
          <Link to="/contact" className="font-semibold text-rx underline underline-offset-4">
            Contact the pharmacy
          </Link>
        </p>
      </Section>
    </>
  );
}
