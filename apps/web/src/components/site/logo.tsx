/** Text wordmark with a simple pharmacy cross. Replace with the client's logo file when supplied. */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={inverted ? "#ffffff" : "var(--color-rx)"} />
        <path
          d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z"
          fill={inverted ? "var(--color-rx)" : "#ffffff"}
        />
      </svg>
      <span className="leading-none">
        <span className="block font-[family-name:var(--font-display)] text-lg font-bold">
          QSI Medicine
        </span>
        <span className={`block text-[11px] ${inverted ? "text-white/70" : "text-mute"}`}>
          Quality Supply International
        </span>
      </span>
    </span>
  );
}
