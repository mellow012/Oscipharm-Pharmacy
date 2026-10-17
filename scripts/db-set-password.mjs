#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
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
  console.error("Usage: npm run db:set-password -- <email>");
  process.exit(1);
}

const password = await promptHidden("Enter the new password (minimum 12 chars): ");
if (password.length < 12) {
  console.error("Password must be at least 12 characters long.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) {
    console.error(`No user found for ${email}.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });

  console.log(`Updated password hash for ${email}.`);
} finally {
  await prisma.$disconnect();
}
