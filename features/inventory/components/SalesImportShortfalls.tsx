import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import {
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/features/shared/components/TableFrame";
import type { UnallocatedProduct } from "@/features/inventory/lib/sales-shortfall";

export function SalesImportShortfalls({ products }: { products: UnallocatedProduct[] }) {
  if (!products.length) return null;

  const totalUnits = products.reduce((sum, product) => sum + product.units, 0);

  return (
    <section className="space-y-space-md">
      <NoticeBanner tone="warning" title="Sales exceeded recorded stock">
        {totalUnits} units were unallocated in the latest sales import. Check for a missing delivery
        or stock count.
      </NoticeBanner>
      <TableFrame
        ariaLabel="Products with unallocated sales units"
        header={<h2 className="font-headline-sm text-headline-sm text-primary">Unallocated units</h2>}
        tableClassName="min-w-[420px]"
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell align="right">Unallocated</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.variantId}>
              <TableCell className="min-w-52">{product.productName}</TableCell>
              <TableCell numeric nowrap className="font-table-cell text-table-cell tabular-nums">
                Short {product.units} units
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </section>
  );
}