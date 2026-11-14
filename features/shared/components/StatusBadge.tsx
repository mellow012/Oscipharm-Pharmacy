import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const toneClasses = {
  success: "border-status-success/25 bg-status-success-bg text-status-success",
  warning: "border-status-warning/25 bg-status-warning-bg text-status-warning-text",
  danger: "border-status-danger/25 bg-status-danger-bg text-status-danger-text",
  neutral: "border-outline-variant bg-status-neutral-bg text-status-neutral",
};

export function StatusBadge({
  children,
  tone = "neutral",
  icon: Icon,
  showDot = false,
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  icon?: LucideIcon;
  showDot?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-space-xs whitespace-nowrap rounded-full border px-space-sm py-0.5 font-label-sm text-label-sm ${toneClasses[tone]}`}
    >
      {Icon ? (
        <Icon aria-hidden="true" size={13} />
      ) : showDot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}
