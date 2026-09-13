import "../lib/load-env";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db, closeDatabase } from "./index";
async function main() {
  try {
    await migrate(db, { migrationsFolder: "src/db/migrations" });
    console.log("Migrations applied.");
  } finally {
    await closeDatabase();
  }
}
main().catch(() => {
  console.error("Migration failed. Check database connection and migrations.");
  process.exitCode = 1;
});
