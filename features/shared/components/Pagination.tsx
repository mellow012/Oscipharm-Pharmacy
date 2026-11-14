"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageCount,
  total,
  rangeStart,
  rangeEnd,
  pageNumbers,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
}) {
  const resultText =
    total === 0 ? "Showing 0 of 0" : `Showing ${rangeStart}–${rangeEnd} of ${total}`;

  return (
    <nav
      aria-label="Pagination"
      className="flex min-w-0 flex-wrap items-center justify-between gap-space-md border-t border-outline-variant bg-surface-container-low px-space-md py-space-sm"
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant" aria-live="polite">
        {resultText}
      </p>
      <div className="flex items-center gap-space-xs">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex size-11 items-center justify-center border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === page ? "page" : undefined}
            onClick={() => onPageChange(pageNumber)}
            className={`hidden min-h-11 min-w-11 items-center justify-center border px-space-sm font-label-md text-label-md sm:flex ${pageNumber === page ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"}`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="flex size-11 items-center justify-center border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
    </nav>
  );
}
