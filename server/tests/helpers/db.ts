import type { Role } from "@prisma/client";
import { prisma } from "../../src/prisma";
import bcrypt from "bcryptjs";

export const TEST_PASSWORD = "Test#2026pass";

/** Remove all rows (children first). Each test file starts from an empty database. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
}

let seq = 0;
export async function createUser(role: Role, name?: string) {
  seq += 1;
  const label = name ?? `${role.toLowerCase()}${seq}`;
  return prisma.user.create({
    data: {
      name: label,
      email: `${label}.${seq}@test.local`.toLowerCase(),
      role,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
    },
  });
}
