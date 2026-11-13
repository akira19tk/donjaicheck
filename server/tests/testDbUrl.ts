import "dotenv/config";

/**
 * Tests delete every row, so they must never touch the development database.
 * Locally: TEST_DATABASE_URL (database name must end in "_test").
 * In CI (CI=true, e.g. GitHub Actions): the throw-away DATABASE_URL service database.
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? (process.env.CI ? process.env.DATABASE_URL : undefined);
  if (!url) {
    throw new Error("Set TEST_DATABASE_URL in server/.env (see .env.example) before running tests.");
  }
  if (!process.env.CI) {
    const name = new URL(url).pathname.slice(1);
    if (!name.endsWith("_test") || url === process.env.DATABASE_URL) {
      throw new Error(`Refusing to run tests on "${name}": use a separate database ending in _test.`);
    }
  }
  return url;
}
