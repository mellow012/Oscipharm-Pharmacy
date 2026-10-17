import assert from "node:assert/strict";
import test from "node:test";
import { assertTestDatabaseIsolated } from "./test-database-safety.mjs";

test("database test guard requires a test database URL", () => {
    assert.throws(() => assertTestDatabaseIsolated("", "postgresql://app@db.example/app"), /TEST_DATABASE_URL is required/);
});

test("database test guard rejects the application database even with different credentials", () => {
    assert.throws(
        () => assertTestDatabaseIsolated("postgresql://test@db.example/app", "postgresql://app@db.example/app"),
        /same database as DATABASE_URL/,
    );
});

test("database test guard accepts a separate database target", () => {
    assert.equal(
        assertTestDatabaseIsolated("postgresql://test@db.example/test_db", "postgresql://app@db.example/app"),
        "postgresql://test@db.example/test_db",
    );
});

test("database test guard treats postgres and postgresql schemes as the same target", () => {
    assert.throws(
        () => assertTestDatabaseIsolated("postgres://test@db.example/app", "postgresql://app@db.example/app"),
        /same database as DATABASE_URL/,
    );
});