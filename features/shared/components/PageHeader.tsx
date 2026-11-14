import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`flex min-w-0 flex-col gap-space-md border-b border-outline-variant pb-space-lg md:flex-row md:items-end md:justify-between ${className}`}
    >
      <div className="min-w-0">
        <p className="font-eyebrow text-eyebrow uppercase text-secondary">{eyebrow}</p>
        <h1 className="mt-space-xs font-headline-lg text-headline-lg text-primary">{title}</h1>
        {description ? (
          <p className="mt-space-xs max-w-3xl font-body-md text-body-md text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-space-sm">{actions}</div>
      ) : null}
    </header>
  );
}
