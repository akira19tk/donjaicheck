import { execSync } from "child_process";
import { testDatabaseUrl } from "./testDbUrl";

// Apply all committed migrations to the test database once per run.
export default function setup() {
  if (process.env.TEST_DB_PREPARED === "1") return;
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  });
}
