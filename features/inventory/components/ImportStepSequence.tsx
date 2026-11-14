export type ImportStep = "file" | "preview" | "confirm" | "result";

const steps: Array<{ id: ImportStep; label: string }> = [
  { id: "file", label: "Choose file" },
  { id: "preview", label: "Preview and validate" },
  { id: "confirm", label: "Confirm import" },
  { id: "result", label: "Result" },
];

export function ImportStepSequence({ current }: { current: ImportStep }) {
  const activeIndex = steps.findIndex((step) => step.id === current);

  return (
    <ol aria-label="Import steps" className="grid min-w-0 grid-cols-2 gap-space-xs sm:grid-cols-4">
      {steps.map((step, index) => {
        const complete = index < activeIndex;
        const active = step.id === current;
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={`flex min-h-11 min-w-0 items-center gap-space-xs border px-space-sm py-space-xs font-label-sm text-label-sm ${active ? "border-primary bg-primary text-on-primary" : complete ? "border-status-success/30 bg-status-success-bg text-status-success" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"}`}
          >
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-[0.65rem] tabular-nums"
            >
              {index + 1}
            </span>
            <span className="min-w-0 break-words">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
