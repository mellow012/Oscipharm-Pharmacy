import assert from "node:assert/strict";
import test from "node:test";
import { getStaffNavigation, isNavItemActive, shouldShowAdminNavigation } from "./staff-navigation.ts";

function labels(items) {
  return items.map((item) => item.label);
}

test("Admin sees permission-filtered staff and Admin navigation", () => {
  const navigation = getStaffNavigation("ADMIN");
  assert.deepEqual(labels(navigation.staff), ["Home", "Sales", "Inventory", "Catalog", "Reports", "News and events"]);
  assert.deepEqual(labels(navigation.admin), ["Overview", "Staff", "Branches", "Memberships", "News and events"]);
  assert.deepEqual(labels(navigation.account), ["Public site", "Sign out"]);
});

test("Branch Manager sees only their existing staff-area permissions and Team tab", () => {
  const navigation = getStaffNavigation("BRANCH_MANAGER");
  assert.deepEqual(labels(navigation.staff), ["Home", "Sales", "Inventory", "Catalog", "Reports", "News and events"]);
  assert.deepEqual(labels(navigation.admin), ["Memberships", "News and events", "Team"]);
  assert.deepEqual(labels(navigation.account), ["Public site", "Sign out"]);
});

test("Sales/POS sees its own staff navigation", () => {
  const navigation = getStaffNavigation("POS");
  assert.deepEqual(labels(navigation.staff), ["Home", "Sales", "Inventory", "Catalog", "Stock import"]);
  assert.deepEqual(labels(navigation.admin), []);
  assert.deepEqual(labels(navigation.account), ["Public site", "Sign out"]);
});

test("Admin route tabs mark only the matching item active", () => {
  const items = getStaffNavigation("ADMIN").admin;
  const activeLabels = (pathname) => items.filter((item) => isNavItemActive(item.href, pathname)).map((item) => item.label);

  assert.deepEqual(activeLabels("/admin"), ["Overview"]);
  assert.deepEqual(activeLabels("/admin/staff"), ["Staff"]);
  assert.deepEqual(activeLabels("/admin/branches"), ["Branches"]);
  assert.deepEqual(activeLabels("/admin/memberships"), ["Memberships"]);
});

test("admin navigation path matching is limited to admin and Team routes", () => {
  for (const pathname of ["/admin", "/admin/staff", "/admin/memberships", "/staff/team", "/staff/team/member-123"]) {
    assert.equal(shouldShowAdminNavigation(pathname), true, pathname);
  }
  for (const pathname of [
    "/staff",
    "/staff/news",
    "/staff/news/new",
    "/staff/news/post-123/edit",
    "/staff/sales",
    "/staff/import",
    "/staff/catalog",
    "/inventory",
    "/reports",
    "/staffing",
    "/administrator",
    "/admin-x",
    "/staff/teamwork",
  ]) {
    assert.equal(shouldShowAdminNavigation(pathname), false, pathname);
  }
});

test("Branch Manager sees Admin navigation and the matching Team or Memberships tab", () => {
  const navigation = getStaffNavigation("BRANCH_MANAGER");
  const visibleItems = (pathname) => shouldShowAdminNavigation(pathname) ? navigation.admin : navigation.staff;
  const activeLabels = (pathname) => visibleItems(pathname).filter((item) => isNavItemActive(item.href, pathname)).map((item) => item.label);

  assert.deepEqual(labels(visibleItems("/staff/team")), labels(navigation.admin));
  assert.deepEqual(activeLabels("/staff/team"), ["Team"]);
  assert.deepEqual(labels(visibleItems("/admin/memberships")), labels(navigation.admin));
  assert.deepEqual(activeLabels("/admin/memberships"), ["Memberships"]);
});

test("staff route tabs match nested pages and news stays in staff navigation", () => {
  const staffItems = getStaffNavigation("ADMIN").staff;
  const adminItems = getStaffNavigation("ADMIN").admin;
  const visibleItems = (pathname) => shouldShowAdminNavigation(pathname) ? adminItems : staffItems;
  const activeStaffLabels = (pathname) => staffItems.filter((item) => isNavItemActive(item.href, pathname)).map((item) => item.label);
  const activeVisibleLabels = (pathname) => visibleItems(pathname).filter((item) => isNavItemActive(item.href, pathname)).map((item) => item.label);

  assert.deepEqual(activeStaffLabels("/staff"), ["Home"]);
  for (const pathname of ["/staff/news", "/staff/news/new", "/staff/news/post-123/edit", "/staff/news/post-123/preview"]) {
    assert.equal(shouldShowAdminNavigation(pathname), false);
    assert.deepEqual(visibleItems(pathname), staffItems);
    assert.deepEqual(activeStaffLabels(pathname), ["News and events"]);
    assert.deepEqual(activeVisibleLabels(pathname), ["News and events"]);
  }
  assert.equal(shouldShowAdminNavigation("/admin"), true);
  assert.deepEqual(activeStaffLabels("/staff/sales/sale-123"), ["Sales"]);
  assert.deepEqual(activeStaffLabels("/staff/import"), []);
  assert.deepEqual(activeStaffLabels("/staffing"), []);
});