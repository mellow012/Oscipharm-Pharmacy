import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const toneClasses = {
  neutral: "border-outline-variant text-on-surface",
  success: "border-status-success text-status-success",
  warning: "border-status-warning text-status-warning-text",
  danger: "border-status-danger text-status-danger-text",
};

export function StatCard({
  label,
  value,
  supportingLine,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  supportingLine?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <article
      className={`min-w-0 border-l-2 bg-surface-container-lowest px-space-md py-space-md ${toneClasses[tone]}`}
    >
      <div className="flex items-start justify-between gap-space-sm">
        <p className="font-table-header text-table-header uppercase text-on-surface-variant">
          {label}
        </p>
        {Icon ? <Icon aria-hidden="true" size={18} className="shrink-0" /> : null}
      </div>
      <p className="mt-space-md break-words font-headline-sm text-headline-sm tabular-nums">
        {value}
      </p>
      {supportingLine ? (
        <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
          {supportingLine}
        </p>
      ) : null}
    </article>
  );
}
