import { createFileRoute } from "@tanstack/react-router";
import { Snowflake } from "lucide-react";

import { PageIntro, Section } from "@/components/site/page-intro";
import { QualityChain } from "@/components/site/quality-chain";
import { refrigeratedExamples } from "@/content/site";

export const Route = createFileRoute("/_site/quality")({
  head: () => ({ meta: [{ title: "Quality & storage — QSI Medicine" }] }),
  component: QualityPage,
});

const receivingChecks = [
  "Product name",
  "Manufacturer",
  "Batch or lot number",
  "Manufacturing information",
  "Expiry date",
  "Packaging condition",
  "Quantity",
  "Storage requirements",
  "Supplier documents, where applicable",
];

function QualityPage() {
  return (
    <>
      <PageIntro eyebrow="Quality & storage" title="How we protect the quality of every medicine">
        <p>
          Quality assurance begins before a medicine reaches our shelves. We follow an internal
          process from procurement to the counter, and we do not purchase medicines from the open
          market.
        </p>
      </PageIntro>

      <Section title="From supplier to counter">
        <QualityChain />
      </Section>

      <Section tone="white" title="What we check when stock arrives">
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {receivingChecks.map((c) => (
            <li key={c} className="flex gap-3 border-b border-rule pb-3">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-rx" />
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Temperature-controlled storage">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-[family-name:var(--font-body)] text-lg font-semibold">
              General storage
            </h3>
            <p className="mt-2 leading-relaxed text-mute">
              Our medicine storage environment is kept at approximately 25°C or below, where
              applicable. Products with specific manufacturer requirements are handled accordingly.
            </p>
            <h3 className="mt-8 font-[family-name:var(--font-body)] text-lg font-semibold">
              Expiry control and stock organisation
            </h3>
            <p className="mt-2 leading-relaxed text-mute">
              Medicines are organised systematically so we can find products quickly, spot items
              approaching expiry early and make sure expired medicine is never supplied.
            </p>
          </div>
          <div className="rounded-3xl border border-cold/25 bg-cold-soft p-7">
            <div className="flex items-center gap-3 text-cold">
              <Snowflake className="size-5" aria-hidden="true" />
              <h3 className="font-[family-name:var(--font-body)] text-lg font-semibold">
                Refrigerated products
              </h3>
            </div>
            <p className="mt-3 text-mute">
              Products that need cold storage are kept in dedicated, monitored refrigerators. These
              can include:
            </p>
            <ul className="mt-4 space-y-2">
              {refrigeratedExamples.map((r) => (
                <li key={r} className="border-b border-cold/15 pb-2">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-14 text-center font-[family-name:var(--font-display)] text-2xl font-semibold md:text-3xl">
          Correct product + correct storage + correct handling = better quality assurance
        </p>
      </Section>
    </>
  );
}
