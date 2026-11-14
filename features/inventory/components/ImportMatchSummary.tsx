import Link from "next/link";

export function ImportMatchSummary({ count, branchId }: { count: number; branchId: string }) {
  const catalogHref = `/staff/catalog?notLinked=1&branchId=${encodeURIComponent(branchId)}`;

  return (
    <p className="font-body-sm text-body-sm text-on-surface-variant">
      Unmatched rows: <span className="font-table-cell text-table-cell tabular-nums text-on-surface">{count}</span>
      {" · "}
      <Link
        href={catalogHref}
        className="text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Review variants not linked to Aronium
      </Link>
    </p>
  );
}