#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const result = await prisma.user.deleteMany({
    where: {
      email: { endsWith: "@pharmacy.test" },
    },
  });

  console.log(`Deleted ${result.count} seeded @pharmacy.test user(s).`);
} finally {
  await prisma.$disconnect();
}
