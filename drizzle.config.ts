import "./src/lib/load-env";
import { defineConfig } from "drizzle-kit";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local before running Drizzle Kit.");
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
});
