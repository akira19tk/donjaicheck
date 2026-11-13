import { testDatabaseUrl } from "./testDbUrl";

// Point the app's Prisma client at the test database before any app module loads.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = "test";
