import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { requireTestDatabaseUrl } from "./test-database-safety.mjs";

try {
    loadEnvFile();
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

const testDatabaseUrl = requireTestDatabaseUrl();
const appDatabaseUrl = process.env.DATABASE_URL ?? "";
const testFiles = [
    "features/catalog/lib/aronium-links.db.test.mjs",
    "features/inventory/lib/stock-import-service.db.test.mjs",
    "features/inventory/lib/sales-import-service.db.test.mjs",
    "prisma/seed.test.mjs",
];
const child = spawn(process.execPath, ["--experimental-strip-types", "--test", "--test-concurrency=1", ...testFiles], {
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