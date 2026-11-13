import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 configuration. DATABASE_URL comes from the environment (.env locally,
// Secret Manager on Cloud Run). The placeholder only lets `prisma generate` run
// during the Docker build, where no database is needed.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
