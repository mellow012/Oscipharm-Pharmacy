import type { Role } from "@prisma/client";
import { can } from "../../../lib/permissions.ts";

const COST_KEYS = new Set([
  "unitCost",
  "lineCost",
  "lineCostInclTax",
  "cost",
  "costTotal",
  "costTotals",
  "costPrice",
  "buyPrice",
  "purchasePrice",
  "margin",
  "totalValue",
  "totalValueInclTax",
  "value",
]);

function stripCostFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripCostFields);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !COST_KEYS.has(key))
        .map(([key, nestedValue]) => [key, stripCostFields(nestedValue)]),
    );
  }
  return value;
}

export function stripCostFieldsForRole<T>(role: Role, payload: T): T {
  return can(role, "price:set") ? payload : stripCostFields(payload) as T;
}
