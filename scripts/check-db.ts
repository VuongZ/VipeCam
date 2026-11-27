import "../src/lib/load-env";
import { sql } from "drizzle-orm";
import { db, closeDatabase } from "../src/db";
import {
  user,
  categories,
  cameras,
  cameraImages,
  cameraRecipes,
  rentalPrices,
  rentals,
  rentalItems,
  feedbacks,
  banners,
  settings,
} from "../src/db/schema";

async function main() {
  const result = await db.execute<{ ok: number }>(sql`select 1 as ok`);
  if (result.rows[0]?.ok !== 1) throw new Error("Unexpected query result.");
  console.log("Database connection verified: SELECT 1 returned 1.");
  const tables = await db.execute<{ table_name: string }>(sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  console.log(
    "Public tables:",
    tables.rows.map((row) => row.table_name).join(", ") || "(empty)",
  );
  const journal = await db.execute<{ name: string | null }>(
    sql`select to_regclass('drizzle.__drizzle_migrations')::text as name`,
  );
  if (journal.rows[0]?.name) {
    const migrations = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    console.log("Applied migrations:", migrations.rows[0].count);
  }
  const counts: Record<string, number> = {};
  for (const [name, table] of Object.entries({
    users: user,
    categories,
    cameras,
    camera_images: cameraImages,
    camera_recipes: cameraRecipes,
    rental_prices: rentalPrices,
    rentals,
    rental_items: rentalItems,
    feedbacks,
    banners,
    settings,
  })) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(table);
    counts[name] = row.count;
  }
  console.log("Row counts:", JSON.stringify(counts));
}
main()
  .catch(() => {
    // Driver errors can contain credentials or query data: keep diagnostics redacted.
    console.error(
      "Database check failed. Verify DATABASE_URL, network access and Neon availability.",
    );
    process.exitCode = 1;
  })
  .finally(closeDatabase);
