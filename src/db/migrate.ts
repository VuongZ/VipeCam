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
main().catch((error: unknown) => {
  const messages: string[] = [];
  for (let e: unknown = error; e && messages.length < 4; e = (e as Error).cause)
    messages.push(e instanceof Error ? e.message : String(e));
  const detail = messages
    .join(" <- ")
    // Never print credentials embedded in a connection string.
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, "postgresql://***");
  console.error(
    `${process.env.GITHUB_ACTIONS ? "::error::" : ""}Migration failed. Check database connection and migrations. ${detail}`,
  );
  process.exitCode = 1;
});
