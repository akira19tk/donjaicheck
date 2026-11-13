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

/** Sample surveys for the first owner, created once (matched by title). */
async function seedSampleSurveys(ownerId: number) {
  const exists = (title: string) => prisma.survey.findFirst({ where: { ownerId, title } });

  const published = "Dinner experience at Donjai Siam";
  if (!(await exists(published))) {
    await prisma.survey.create({
      data: {
        ownerId,
        title: published,
        description: "Thank you for dining with us! This short survey takes about one minute.",
        status: "PUBLISHED",
        publishedAt: new Date(),
        questions: {
          create: [
            { position: 1, text: "How would you rate the taste of your food?", type: "RATING", required: true },
            { position: 2, text: "How fast was the service?", type: "RATING", required: true },
            {
              position: 3,
              text: "Which dish did you enjoy most?",
              type: "SINGLE_CHOICE",
              required: true,
              options: {
                create: ["Pad Thai", "Tom Yum Goong", "Green curry", "Mango sticky rice"].map((label, i) => ({ position: i + 1, label })),
              },
            },
            { position: 4, text: "Anything we could do better?", type: "TEXT", required: false },
          ],
        },
      },
    });
  }

  const draft = "Lunch set menu feedback (draft)";
  if (!(await exists(draft))) {
    await prisma.survey.create({
      data: {
        ownerId,
        title: draft,
        questions: { create: [{ position: 1, text: "Was the lunch set good value for money?", type: "RATING", required: true }] },
      },
    });
  }
}

async function main() {
  const ownerPassword = required("ADMIN_PASSWORD");
  const owners = [];
  for (const o of OWNERS) owners.push(await upsertUser(o.email, o.name, Role.SURVEY_OWNER, ownerPassword));

  const demo = (process.env.SEED_DEMO_DATA ?? (process.env.NODE_ENV === "production" ? "false" : "true")) === "true";
  if (demo) {
    const customerPassword = required("DEMO_USER_PASSWORD");
    for (const r of RESPONDENTS) await upsertUser(r.email, r.name, Role.RESPONDENT, customerPassword);
    await seedSampleSurveys(owners[0].id);
  }

  console.log(`Seed complete: ${OWNERS.length} owners${demo ? `, ${RESPONDENTS.length} demo respondents, sample surveys` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
