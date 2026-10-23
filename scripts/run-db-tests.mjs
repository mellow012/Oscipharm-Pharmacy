import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { requireTestDatabaseUrl } from "./test-database-safety.mjs";

try {
    loadEnvFile();
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

const testFiles = [
    "features/catalog/lib/aronium-links.db.test.mjs",
    "features/inventory/lib/stock-import-service.db.test.mjs",
    "features/inventory/lib/sales-import-service.db.test.mjs",
    "features/auth/lib/auth-throttle.db.test.mjs",
    "features/auth/lib/password-reset.db.test.mjs",
    "features/auth/lib/staff-lifecycle.db.test.mjs",
    "features/admin/lib/staff-service.db.test.mjs",
    "features/news/lib/news-service.db.test.mjs",
    "prisma/seed.test.mjs",
];
const requestedFiles = process.argv.slice(2);
const invalidFiles = requestedFiles.filter((file) => !testFiles.includes(file));
if (invalidFiles.length) {
    console.error(`Unknown DB test file: ${invalidFiles.join(", ")}`);
    console.error("Choose a file from the configured DB test list.");
    process.exit(1);
}

const testDatabaseUrl = requireTestDatabaseUrl();
const appDatabaseUrl = process.env.DATABASE_URL ?? "";
const selectedFiles = requestedFiles.length ? requestedFiles : testFiles;
const child = spawn(process.execPath, ["--experimental-strip-types", "--test", "--test-concurrency=1", ...selectedFiles], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: "inherit",
    env: {
        ...process.env,
        PHARMACY_GUARD_DATABASE_URL: appDatabaseUrl,
        DATABASE_URL: testDatabaseUrl,
        DIRECT_URL: testDatabaseUrl,
        TEST_DATABASE_URL: testDatabaseUrl,
    },
});

child.on("error", (error) => {
    console.error(error);
    process.exitCode = 1;
});
child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
});