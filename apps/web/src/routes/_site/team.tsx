import { createFileRoute } from "@tanstack/react-router";

import { PageIntro, Section } from "@/components/site/page-intro";
import { management, structure } from "@/content/site";

export const Route = createFileRoute("/_site/team")({
  head: () => ({ meta: [{ title: "Our team — QSI Medicine" }] }),
  component: TeamPage,
});

function initials(name: string) {
  return name
    .replace(/\(.*?\)|Wing Commander/g, "")
    .trim()
    .split(/\s+/)
    .filter((w) => !w.endsWith("."))
    .slice(-2)
    .map((w) => w[0])
    .join("");
}

function TeamPage() {
  return (
    <>
      <PageIntro eyebrow="Our team" title="The people responsible for your medicine">
        <p>Disciplined management, a qualified pharmacy team and clear accountability.</p>
      </PageIntro>

      <Section title="Management">
        <div className="grid gap-6 md:grid-cols-2">
          {management.map((m) => (
            <article key={m.name} className="rounded-3xl border border-rule bg-white p-7">
              {/* TODO(client): replace initials with approved portrait photos */}
              <div
                aria-hidden="true"
                className="grid size-16 place-items-center rounded-full bg-rx-soft font-[family-name:var(--font-display)] text-xl font-semibold text-rx"
              >
                {initials(m.name)}
              </div>
              <p className="mt-5 text-sm font-medium text-rx">{m.role}</p>
              <h3 className="mt-1 text-2xl font-semibold">
                {m.name}
                {m.credentials && (
                  <span className="text-lg font-normal text-mute">, {m.credentials}</span>
                )}
              </h3>
              <p className="mt-3 leading-relaxed text-mute">{m.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="white" title="Our pharmacy team">
        <p className="prose-measure leading-relaxed text-mute">
          QSI Medicine has a team of qualified sales and pharmacy personnel who hold the
          professional credentials required for pharmacy duties. They serve customers courteously,
          responsibly and professionally.
        </p>
        {/* TODO(client): list pharmacists with Pharmacy Council registration numbers ONLY after PCB verification */}
      </Section>

      <Section title="How we are organised">
        <ol className="max-w-md">
          {structure.map((s, i) => (
            <li key={s} className="relative pb-6 pl-8 last:pb-0">
              {i < structure.length - 1 && (
                <span aria-hidden="true" className="absolute left-[7px] top-5 h-full w-px bg-rule" />
              )}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1.5 size-[15px] rounded-full border-2 ${
                  i === structure.length - 1 ? "border-rx bg-rx" : "border-rx bg-paper"
                }`}
              />
              <span className={i < 2 ? "font-semibold" : ""}>{s}</span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
