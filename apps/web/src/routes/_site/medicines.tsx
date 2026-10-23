import { Link, createFileRoute } from "@tanstack/react-router";
import { FileText, Snowflake } from "lucide-react";

import { PageIntro, Section } from "@/components/site/page-intro";
import { categories, categoryFlags } from "@/content/site";

export const Route = createFileRoute("/_site/medicines")({
  head: () => ({ meta: [{ title: "Medicines & healthcare — QSI Medicine" }] }),
  component: MedicinesPage,
});

function MedicinesPage() {
  return (
    <>
      <PageIntro eyebrow="Medicines" title="Medicines and healthcare products">
        <p>
          The categories we carry. Stock changes daily, so please call or WhatsApp us to confirm
          a specific medicine before you visit.
        </p>
      </PageIntro>
      <Section>
        <div className="mb-8 flex flex-wrap gap-5 text-sm text-mute">
          <span className="inline-flex items-center gap-2">
            <FileText className="size-4 text-rx" aria-hidden="true" /> Prescription required
          </span>
          <span className="inline-flex items-center gap-2">
            <Snowflake className="size-4 text-cold" aria-hidden="true" /> Stored refrigerated
          </span>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-3xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const flag = categoryFlags[c];
            return (
              <li key={c} className="flex items-center justify-between gap-4 bg-white px-5 py-4">
                <span>{c}</span>
                {flag === "rx" && (
                  <FileText className="size-4 shrink-0 text-rx" aria-label="Prescription required" />
                )}
                {flag === "cold" && (
                  <Snowflake className="size-4 shrink-0 text-cold" aria-label="Stored refrigerated" />
                )}
              </li>
            );
          })}
        </ul>
        <p className="prose-measure mt-8 text-sm text-mute">
          Except for OTC medicines, Bangladesh DGDA guidance requires a prescription from a
          registered physician for antimicrobials and other medicines.{" "}
          <Link to="/contact" className="font-semibold text-rx underline underline-offset-4">
            Ask about availability
          </Link>
        </p>
      </Section>
    </>
  );
}
