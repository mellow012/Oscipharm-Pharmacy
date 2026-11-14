import type { ReactNode } from "react";

const toneClasses = {
  warning: "border-status-warning bg-status-warning-bg text-status-warning-text",
  danger: "border-status-danger bg-status-danger-bg text-status-danger-text",
  info: "border-primary bg-primary-fixed/40 text-on-primary-fixed-variant",
};

export function NoticeBanner({
  tone,
  title,
  children,
  action,
  className = "",
}: {
  tone: "warning" | "danger" | "info";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      role={tone === "danger" ? "alert" : "status"}
      className={`flex min-w-0 flex-col gap-space-sm border-y border-r border-l-4 px-space-md py-space-md sm:flex-row sm:items-start sm:justify-between ${toneClasses[tone]} ${className}`}
    >
      <div className="min-w-0">
        {title ? <h2 className="font-label-md text-label-md">{title}</h2> : null}
        <div
          className={title ? "mt-space-xs font-body-sm text-body-sm" : "font-body-sm text-body-sm"}
        >
          {children}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
