export type PageNumber = number | "ellipsis";

export function getPageNumbers(currentPage: number, pageCount: number): PageNumber[] {
  if (!Number.isFinite(pageCount) || pageCount < 1) return [];

  const total = Math.floor(pageCount);
  const current = Math.min(Math.max(Math.floor(currentPage), 1), total);
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  let left = Math.max(2, current - 1);
  let right = Math.min(total - 1, current + 1);
  if (right - left < 2) {
    if (left === 2) right = Math.min(total - 1, left + 2);
    else left = Math.max(2, right - 2);
  }
  const pages: PageNumber[] = [1];

  if (left > 2) pages.push("ellipsis");
  for (let page = left; page <= right; page += 1) pages.push(page);
  if (right < total - 1) pages.push("ellipsis");
  pages.push(total);

  return pages;
}
