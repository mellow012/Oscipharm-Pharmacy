import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageNumber } from "@/features/shared/lib/page-range";

export function LinkPagination({
  page,
  pageCount,
  total,
  rangeStart,
  rangeEnd,
  pages,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  pages: PageNumber[];
  hrefForPage: (page: number) => string;
}) {
  return (
    <nav
      aria-label="Catalog pagination"
      className="flex min-w-0 flex-wrap items-center justify-between gap-space-sm border-y border-outline-variant bg-surface-container-low px-space-md py-space-sm"
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant" aria-live="polite">
        {total === 0 ? "Showing 0 of 0" : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-space-xs">
        {page > 1 ? (
          <Link
            href={hrefForPage(page - 1)}
            aria-label="Previous page"
            className="flex min-h-11 items-center gap-space-xs border border-outline-variant bg-surface-container-lowest px-space-sm text-on-surface-variant hover:bg-surface-container-high"
          >
            <ChevronLeft aria-hidden="true" size={16} />
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="flex min-h-11 items-center gap-space-xs border border-outline-variant px-space-sm text-on-surface-variant/60"
          >
            <ChevronLeft aria-hidden="true" size={16} />
            Previous
          </span>
        )}
        {pages.map((pageNumber, index) =>
          pageNumber === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-space-xs text-on-surface-variant"
            >
              …
            </span>
          ) : (
            <Link
              key={pageNumber}
              href={hrefForPage(pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={pageNumber === page ? "page" : undefined}
              className={`flex size-11 items-center justify-center border font-label-md text-label-md ${pageNumber === page ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"}`}
            >
              {pageNumber}
            </Link>
          ),
        )}
        {page < pageCount ? (
          <Link
            href={hrefForPage(page + 1)}
            aria-label="Next page"
            className="flex min-h-11 items-center gap-space-xs border border-outline-variant bg-surface-container-lowest px-space-sm text-on-surface-variant hover:bg-surface-container-high"
          >
            Next
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="flex min-h-11 items-center gap-space-xs border border-outline-variant px-space-sm text-on-surface-variant/60"
          >
            Next
            <ChevronRight aria-hidden="true" size={16} />
          </span>
        )}
      </div>
    </nav>
  );
}
