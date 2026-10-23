import { disclaimer } from "@/content/site";

export function Disclaimer() {
  return (
    <aside
      aria-labelledby="disclaimer-title"
      className="rounded-3xl border border-rule border-l-4 border-l-ink bg-white p-6"
    >
      <h2 id="disclaimer-title" className="text-xl font-semibold">
        Medical disclaimer
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-mute">
        {disclaimer.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </aside>
  );
}
