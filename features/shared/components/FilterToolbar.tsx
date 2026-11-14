import Form from "next/form";
import type { ReactNode } from "react";

const toolbarClassName =
  "flex min-w-0 flex-wrap items-end gap-space-md border-y border-outline-variant bg-surface-container-lowest px-space-md py-space-md";

export function FilterToolbar({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action: string;
  className?: string;
}) {
  return (
    <Form action={action} className={`${toolbarClassName} ${className}`}>
      {children}
    </Form>
  );
}
