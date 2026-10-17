#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
import { seedCanonicalBranch } from "../prisma/seed.ts";
import { loadEnvFile } from "node:process";
import { readFileSync } from "node:fs";

const expectedConfirmation = "Blantyre Town Lunzu";
if (process.argv[2] !== "--confirm-reset" || process.argv[3] !== expectedConfirmation) {
    console.error(`Refusing reset. Type the exact confirmation: --confirm-reset "${expectedConfirmation}"`);
    process.exit(1);
}

try {
    loadEnvFile();
} catch (error) {
    console.error(`Unable to load .env: ${error.message}`);
    process.exit(1);
}

const directUrl = process.env.DIRECT_URL?.trim();
const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
const allowedHostLine = envFile.match(/^\s*DEV_RESET_ALLOWED_HOST\s*=\s*(.*?)\s*$/m)?.[1];
const allowedHost = allowedHostLine?.replace(/^(["'])(.*)\1$/, "$2").trim().toLowerCase();
if (!directUrl || !allowedHost) {
    console.error("DIRECT_URL and DEV_RESET_ALLOWED_HOST must be set in .env. Refusing reset.");
    process.exit(1);
}

let host;
try {
    host = new URL(directUrl).hostname.toLowerCase();
} catch {
    console.error("DIRECT_URL is not a valid URL. Refusing reset.");
    process.exit(1);
}
if (host !== allowedHost) {
    console.error(`Refusing reset: DIRECT_URL host ${host} does not match DEV_RESET_ALLOWED_HOST.`);
    process.exit(1);
}
if (process.env.DATABASE_URL) {
    const appHost = new URL(process.env.DATABASE_URL).hostname.toLowerCase();
    if (appHost !== allowedHost) {
        console.error(`Refusing reset: DATABASE_URL host ${appHost} does not match DEV_RESET_ALLOWED_HOST.`);
        process.exit(1);
    }
}
if (process.env.NODE_ENV === "production") {
    console.error("Refusing reset while NODE_ENV=production.");
    process.exit(1);
}

process.env.DATABASE_URL = directUrl;
process.env.DIRECT_URL = directUrl;
console.log(`Reset target host: ${host}`);

const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });
try {
    const rowCounts = {
        auditLogs: await prisma.auditLog.count(),
        saleItems: await prisma.saleItem.count(),
        sales: await prisma.sale.count(),
        membershipApplications: await prisma.membershipApplication.count(),
        newsImages: await prisma.newsImage.count(),
        news: await prisma.news.count(),
        batches: await prisma.batch.count(),
        branchPrices: await prisma.branchPrice.count(),
        aroniumProductLinks: await prisma.aroniumProductLink.count(),
        variants: await prisma.variant.count(),
        ingredients: await prisma.ingredient.count(),
        categories: await prisma.category.count(),
        users: await prisma.user.count(),
        branches: await prisma.branch.count(),
    };
    console.log(`Rows to delete before reset: ${JSON.stringify(rowCounts, null, 2)}`);
    console.log(`Resetting to canonical branch: ${expectedConfirmation}`);
    await seedCanonicalBranch(prisma, { allowAuthorizedTarget: true });
    console.log("Dev database reset complete.");
} finally {
    await prisma.$disconnect();
}
