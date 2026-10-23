import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Inner-page hero: soft mint panel, breadcrumb, large headline. */
export function PageIntro({
  title,
  eyebrow,
  children,
}: {
  title: ReactNode;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-3 pt-3 md:px-5 md:pt-5">
      <div className="photo-slot mx-auto max-w-[88rem] overflow-hidden rounded-[2rem]">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 md:pb-20 md:pt-16">
          <nav aria-label="Breadcrumb" className="text-sm text-mute">
            <Link to="/" className="hover:text-ink">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span className="text-ink">{eyebrow ?? (typeof title === "string" ? title : "")}</span>
          </nav>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] md:text-[3.5rem]">
            {title}
          </h1>
          {children && (
            <div className="prose-measure mt-5 text-lg leading-relaxed text-mute">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Section({
  title,
  lead,
  children,
  tone = "white",
}: {
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  tone?: "paper" | "white" | "mint";
}) {
  const bg = tone === "mint" ? "bg-mint" : tone === "paper" ? "bg-paper" : "bg-white";
  return (
    <section className={bg}>
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        {title && <h2 className="max-w-3xl text-3xl font-semibold leading-tight md:text-[2.6rem]">{title}</h2>}
        {lead && <div className="prose-measure mt-4 text-lg text-mute">{lead}</div>}
        <div className={title || lead ? "mt-12" : ""}>{children}</div>
      </div>
    </section>
  );
}
