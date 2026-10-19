export type SaleAmountRow = {
  subtotalAmount: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  isRefund: boolean;
};

export function buildSalesSummary(rows: SaleAmountRow[]) {
  return rows.reduce((summary, row) => {
    const subtotal = Number(row.subtotalAmount);
    const discount = Number(row.discountAmount);
    const total = Number(row.totalAmount);
    if (row.isRefund) {
      summary.refunds += total;
      summary.combinedNet += total;
    } else {
      summary.gross += subtotal;
      summary.discounts += discount;
      summary.netSales += total;
      summary.combinedNet += total;
    }
    return summary;
  }, { gross: 0, discounts: 0, netSales: 0, refunds: 0, combinedNet: 0 });
}
