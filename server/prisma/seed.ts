/**
 * Idempotent seed (system-sds.md §2, D-06).
 * - Survey owners: always created; password from ADMIN_PASSWORD (required).
 * - Demo respondents: created when SEED_DEMO_DATA is "true"; password from DEMO_USER_PASSWORD.
 * Passwords are never written in code and never printed. Existing users keep their passwords.
 */
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`ERROR: ${name} must be set to run the seed (see server/.env.example).`);
    process.exit(1);
  }
  return value;
}

async function upsertUser(email: string, name: string, role: Role, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email, name, role, passwordHash: await hashPassword(password) },
  });
}

export const OWNERS = [
  { email: "manager@donjai.test", name: "Somchai (Donjai Siam manager)" },
  { email: "manager2@donjai.test", name: "Malee (Donjai Ari manager)" },
];
export const RESPONDENTS = [
  { email: "customer1@donjai.test", name: "Customer One" },
  { email: "customer2@donjai.test", name: "Customer Two" },
  { email: "customer3@donjai.test", name: "Customer Three" },
];

async function main() {
  const ownerPassword = required("ADMIN_PASSWORD");
  for (const o of OWNERS) await upsertUser(o.email, o.name, Role.SURVEY_OWNER, ownerPassword);

  const demo = (process.env.SEED_DEMO_DATA ?? (process.env.NODE_ENV === "production" ? "false" : "true")) === "true";
  if (demo) {
    const customerPassword = required("DEMO_USER_PASSWORD");
    for (const r of RESPONDENTS) await upsertUser(r.email, r.name, Role.RESPONDENT, customerPassword);
  }

  console.log(`Seed complete: ${OWNERS.length} owners${demo ? `, ${RESPONDENTS.length} demo respondents` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
