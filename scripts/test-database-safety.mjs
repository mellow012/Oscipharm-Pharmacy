import { loadEnvFile } from "node:process";

try {
    loadEnvFile();
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

export function databaseTarget(value) {
    const url = new URL(value);
    const protocol = url.protocol === "postgres:" ? "postgresql:" : url.protocol;
    return `${protocol}//${url.hostname.toLowerCase()}:${url.port || "5432"}${url.pathname}`;
}

export function assertTestDatabaseIsolated(testUrl, appUrl) {
    if (!testUrl) throw new Error("TEST_DATABASE_URL is required for database tests.");
    if (appUrl && databaseTarget(testUrl) === databaseTarget(appUrl)) {
        throw new Error("Refusing database tests: TEST_DATABASE_URL targets the same database as DATABASE_URL.");
    }
    return testUrl;
}

export function requireTestDatabaseUrl() {
    const testUrl = process.env.TEST_DATABASE_URL?.trim();
    const appUrl = process.env.PHARMACY_GUARD_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
    return assertTestDatabaseIsolated(testUrl, appUrl);
}