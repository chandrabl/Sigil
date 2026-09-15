import { Phase } from "../lib/auctionLogic";

const STEPS: { phase: Phase; label: string; hint: string }[] = [
  { phase: Phase.Commit, label: "Commit", hint: "Bids locked, amounts hidden" },
  { phase: Phase.Reveal, label: "Reveal", hint: "Bidders open their own seal" },
  { phase: Phase.Settled, label: "Settled", hint: "Winner and price published" },
];

export function PhaseRail({ current }: { current: Phase }) {
  const currentIndex = STEPS.findIndex((s) => s.phase === current);

  return (
    <ol className="flex w-full items-start gap-0">
      {STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "active" : "upcoming";
        return (
          <li key={step.phase} className="flex flex-1 flex-col">
            <div className="flex items-center">
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                  state === "done" &&
                    "border-moss-400 bg-moss-500/20 text-moss-400",
                  state === "active" &&
                    "border-brass-400 bg-brass-500/20 text-brass-400",
                  state === "upcoming" &&
                    "border-ink-600 text-parchment-300/50",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={[
                    "mx-2 h-px flex-1",
                    state === "done" ? "bg-moss-400/60" : "bg-ink-600",
                  ].join(" ")}
                />
              )}
            </div>
            <div className="mt-2">
              <p
                className={[
                  "font-display text-sm",
                  state === "active" ? "text-brass-400" : "text-parchment-100/90",
                ].join(" ")}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-parchment-300/60">{step.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
