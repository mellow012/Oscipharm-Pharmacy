import assert from "node:assert/strict";
import test from "node:test";
import { getStaffNavigation, isNavItemActive } from "./staff-navigation.ts";

function labels(items) {
  return items.map((item) => item.label);
}

test("Admin sees permission-filtered staff and Admin navigation", () => {
  const navigation = getStaffNavigation("ADMIN");
  assert.deepEqual(labels(navigation.staff), ["Home", "Sales", "Inventory", "Catalog", "Reports"]);
  assert.deepEqual(labels(navigation.admin), ["Overview", "Staff", "Memberships", "News and events"]);
  assert.deepEqual(labels(navigation.account), ["Public site", "Sign out"]);
});

test("Branch Manager sees only their existing staff-area permissions and Team tab", () => {
  const navigation = getStaffNavigation("BRANCH_MANAGER");
  assert.deepEqual(labels(navigation.staff), ["Home", "Sales", "Inventory", "Catalog", "Reports"]);
  assert.deepEqual(labels(navigation.admin), ["Memberships", "News and events", "Team"]);
  assert.deepEqual(labels(navigation.account), ["Public site", "Sign out"]);
});

test("Sales/POS sees only the Account menu", () => {
  const navigation = getStaffNavigation("POS");
  assert.deepEqual(labels(navigation.staff), []);
  assert.deepEqual(labels(navigation.admin), []);
  assert.deepEqual(labels(navigation.account), ["Public site", "Sign out"]);
});

test("Admin route tabs mark only the matching item active", () => {
  const items = getStaffNavigation("ADMIN").admin;
  const activeLabels = (pathname) => items.filter((item) => isNavItemActive(item.href, pathname)).map((item) => item.label);

  assert.deepEqual(activeLabels("/admin"), ["Overview"]);
  assert.deepEqual(activeLabels("/admin/staff"), ["Staff"]);
  assert.deepEqual(activeLabels("/admin/memberships"), ["Memberships"]);
});

test("staff route tabs match nested pages without activating unrelated paths", () => {
  const staffItems = getStaffNavigation("ADMIN").staff;
  const adminItems = getStaffNavigation("ADMIN").admin;
  const allItems = [...staffItems, ...adminItems];
  const activeLabels = (pathname) => allItems.filter((item) => isNavItemActive(item.href, pathname)).map((item) => item.label);

  assert.deepEqual(activeLabels("/staff"), ["Home"]);
  assert.deepEqual(activeLabels("/staff/news/new"), ["News and events"]);
  assert.deepEqual(activeLabels("/staff/sales/sale-123"), ["Sales"]);
  assert.deepEqual(activeLabels("/staff/import"), []);
  assert.deepEqual(activeLabels("/staffing"), []);
});