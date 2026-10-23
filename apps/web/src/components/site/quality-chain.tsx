import { qualityChain } from "@/content/site";

/**
 * The signature element: the seven-step path every medicine takes before it
 * reaches the counter. Vertical on mobile, horizontal rail on large screens.
 */
export function QualityChain({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return (
    <ol className="chain-reveal relative grid gap-0 lg:grid-cols-7 lg:gap-4">
      {qualityChain.map((item, i) => (
        <li key={item.step} className="relative flex gap-4 pb-8 lg:block lg:pb-0">
          {/* connector */}
          <span
            aria-hidden="true"
            className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px ${dark ? "bg-white/20" : "bg-rule"} lg:left-8 lg:top-[15px] lg:h-px lg:w-[calc(100%)]`}
            style={{ display: i === qualityChain.length - 1 ? "none" : undefined }}
          />
          <span
            className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
              item.step === "Storage" ? "bg-cold text-white" : dark ? "bg-sun text-deep" : "bg-rx text-white"
            }`}
          >
            {i + 1}
          </span>
          <div className="lg:mt-4">
            <h3 className="font-[family-name:var(--font-body)] text-base font-semibold">
              {item.step}
            </h3>
            {!compact && <p className={`mt-1.5 text-sm leading-relaxed ${dark ? "text-white/65" : "text-mute"}`}>{item.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
