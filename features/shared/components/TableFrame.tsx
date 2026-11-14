import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function TableFrame({
  children,
  header,
  caption,
  ariaLabel,
  className = "",
  tableClassName = "",
}: {
  children: ReactNode;
  header?: ReactNode;
  caption?: string;
  ariaLabel?: string;
  className?: string;
  tableClassName?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden border border-outline-variant bg-surface-container-lowest ${className}`}
    >
      {header ? (
        <div className="border-b border-outline-variant bg-surface-container-low px-space-md py-space-md">
          {header}
        </div>
      ) : null}
      <div
        role="region"
        aria-label={ariaLabel ?? caption ?? "Data table"}
        tabIndex={0}
        className="max-w-full overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <table
          aria-label={caption ? undefined : ariaLabel}
          className={`w-full border-collapse text-left ${tableClassName}`}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          {children}
        </table>
      </div>
    </section>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-outline-variant bg-surface-container-high font-table-header text-table-header uppercase text-on-surface-variant">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-outline-variant/70">{children}</tbody>;
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`align-top transition-colors hover:bg-surface-container-low ${className}`}>
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  className = "",
  align = "left",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "center" | "right" }) {
  return (
    <th
      scope="col"
      {...props}
      className={`px-space-md py-space-sm font-table-header text-table-header ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
  numeric = false,
  nowrap = false,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean; nowrap?: boolean }) {
  return (
    <td
      {...props}
      className={`px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant ${numeric ? "text-right tabular-nums" : ""} ${nowrap ? "whitespace-nowrap" : "whitespace-normal break-words"} ${className}`}
    >
      {children}
    </td>
  );
}
