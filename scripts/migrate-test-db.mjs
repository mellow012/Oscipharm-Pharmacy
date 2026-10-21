import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { requireTestDatabaseUrl } from "./test-database-safety.mjs";

try { loadEnvFile(); } catch (e) { if (e.code !== "ENOENT") throw e; }

const url = requireTestDatabaseUrl();
const host = new URL(url).host;
console.log("Target host:", host);
if (host.includes("supabase")) {
  console.error("Refusing: test URL points at Supabase.");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
});
process.exit(result.status ?? 1);