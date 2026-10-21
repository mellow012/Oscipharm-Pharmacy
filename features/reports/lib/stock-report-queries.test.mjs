import assert from "node:assert/strict";
import test from "node:test";
import { buildExpiryQuery, buildLowStockQuery } from "./stock-report-queries.ts";
import { buildSalesReportQuery } from "./sales-report-query.ts";

test("low-stock query retains and labels products with no ingredient", () => {
    const query = buildLowStockQuery("branch-1").sql;
    assert.match(query, /LEFT JOIN "Ingredient" ingredient ON ingredient\.id = v\."ingredientId"/);
    assert.match(query, /COALESCE\(ingredient\.name, 'Uncategorized'\) AS "ingredientName"/);
    assert.match(query, /GROUP BY[\s\S]*COALESCE\(ingredient\.name, 'Uncategorized'\)/);
    assert.match(query, /batch\."expiryDateKnown" = false OR batch\."expiryDate" >=/);
    assert.doesNotMatch(query, /batch\."expiryDateKnown" = true/);
});

test("expiry query retains and labels products with no ingredient", () => {
    const query = buildExpiryQuery("branch-1").sql;
    assert.match(query, /LEFT JOIN "Ingredient" ingredient ON ingredient\.id = v\."ingredientId"/);
    assert.match(query, /COALESCE\(ingredient\.name, 'Uncategorized'\) AS "ingredientName"/);
    assert.match(query, /batch\."expiryDateKnown" = true/);
    assert.doesNotMatch(query, /THEN 'In date'[\s\S]*expiryDateKnown = false/);
});

test("sales report preserves signed refund subtotals and includes history-only financial sales", () => {
    const query = buildSalesReportQuery({ branchId: "branch-1", from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-08T00:00:00Z") }).sql;
    assert.match(query, /SUM\(si\."subtotal"\)/);
    assert.doesNotMatch(query, /ABS\(si\."subtotal"\)/);
    assert.doesNotMatch(query, /"stockAffected"/);
    assert.match(query, /COALESCE\(v\."brandName", 'Unspecified product'\)/);
    assert.match(query, /s\."isRefund"/);
    assert.match(query, /s\."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa\/Blantyre'/);
    assert.doesNotMatch(query, /s\."createdAt" AT TIME ZONE 'Africa\/Blantyre'/);
});