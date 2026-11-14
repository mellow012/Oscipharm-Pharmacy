import { TableBody, TableCell, TableFrame, TableHead, TableHeaderCell, TableRow } from "@/features/shared/components/TableFrame";

export type ImportIssueRow = {
  rowNumber: number;
  code?: string | null;
  reason: string;
  documentNumber?: string;
};

export function ImportIssueTable({
  title,
  ariaLabel,
  rows,
}: {
  title: string;
  ariaLabel: string;
  rows: ImportIssueRow[];
}) {
  return (
    <TableFrame
      ariaLabel={ariaLabel}
      header={<h3 className="font-headline-sm text-headline-sm text-primary">{title}</h3>}
      tableClassName="min-w-[560px]"
    >
      <TableHead>
        <tr>
          <TableHeaderCell align="right">Row</TableHeaderCell>
          {rows.some((row) => row.documentNumber !== undefined) ? (
            <TableHeaderCell>Document</TableHeaderCell>
          ) : null}
          <TableHeaderCell>Aronium code</TableHeaderCell>
          <TableHeaderCell>Reason</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row.rowNumber}-${row.code ?? "no-code"}-${index}`}>
            <TableCell numeric nowrap>{row.rowNumber}</TableCell>
            {rows.some((entry) => entry.documentNumber !== undefined) ? (
              <TableCell nowrap className="font-table-cell text-table-cell tabular-nums">
                {row.documentNumber ?? "—"}
              </TableCell>
            ) : null}
            <TableCell nowrap className="font-table-cell text-table-cell tabular-nums">
              {row.code?.trim() || "No code"}
            </TableCell>
            <TableCell className="min-w-64">{row.reason}</TableCell>
          </TableRow>
        ))}
        {!rows.length ? (
          <TableRow>
            <TableCell colSpan={rows.some((row) => row.documentNumber !== undefined) ? 4 : 3}>
              None.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </TableFrame>
  );
}