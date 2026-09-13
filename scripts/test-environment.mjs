import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

export const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (
  !testDatabaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(testDatabaseUrl).hostname,
  )
) {
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated local PostgreSQL database. Tests never use the Neon DATABASE_URL.",
  );
}
