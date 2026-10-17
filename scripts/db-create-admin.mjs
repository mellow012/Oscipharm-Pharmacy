#!/usr/bin/env node

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { stdin, stdout } from "node:process";

function promptHidden(prompt) {
  return new Promise((resolve) => {
    const buffer = [];
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write(prompt);

    const onData = (chunk) => {
      const bytes = chunk.toString();
      for (const char of bytes) {
        if (char === "\r" || char === "\n") {
          stdout.write("\n");
          stdin.removeListener("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          resolve(Buffer.from(buffer).toString("utf8"));
          return;
        }
        if (char === "\u0003") {
          stdout.write("\n");
          stdin.removeListener("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.exit(1);
        }
        buffer.push(char.charCodeAt(0));
      }
    };

    stdin.on("data", onData);
  });
}

const args = process.argv.slice(2);
const email = args[0]?.trim();
if (!email) {
  console.error("Usage: npm run db:create-admin -- <email>");
  process.exit(1);
}

const password = await promptHidden("Enter the admin password (minimum 12 chars): ");
if (password.length < 12) {
  console.error("Password must be at least 12 characters long.");
  process.exit(1);
}

const hashed = await bcrypt.hash(password, 10);
const prisma = new PrismaClient();
try {
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Administrator",
      role: Role.ADMIN,
      branchId: null,
      passwordHash: hashed,
    },
    create: {
      name: "Administrator",
      email,
      role: Role.ADMIN,
      branchId: null,
      passwordHash: hashed,
    },
  });

  console.log(`Admin account ready for ${admin.email}.`);
} finally {
  await prisma.$disconnect();
}
