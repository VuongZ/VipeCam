import "server-only";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool as LocalPool } from "pg";
import { drizzle as localDrizzle } from "drizzle-orm/node-postgres";
import {
  getCloudflareContext,
  type CloudflareContext,
} from "@opennextjs/cloudflare";
import { after } from "next/server";
import * as schema from "./schema";

type Database = NeonDatabase<typeof schema>;
function connect(connectionString: string | undefined) {
  if (!connectionString)
    throw new Error(
      "DATABASE_URL is required. Configure it in .env.local or the server environment.",
    );
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(
      "DATABASE_URL must be a valid PostgreSQL connection string.",
    );
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use PostgreSQL.");
  const options = {
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  };
  // Dedicated local regression databases use TCP; hosted Neon always uses its serverless driver.
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    const pool = new LocalPool(options);
    pool.on("error", () =>
      console.error("An idle database connection failed."),
    );
    const db: Database = localDrizzle(pool, { schema });
    return { db, pool };
  }
  if (typeof WebSocket !== "undefined")
    neonConfig.webSocketConstructor = WebSocket;
  const pool = new NeonPool(options);
  pool.on("error", () => console.error("An idle Neon connection failed."));
  return { db: drizzle(pool, { schema }), pool };
}
type Connection = ReturnType<typeof connect>;
const globalDb = globalThis as typeof globalThis & {
  vipecamConnection?: Connection;
};
let nodeConnection: Connection | undefined =
  process.env.NODE_ENV !== "production"
    ? globalDb.vipecamConnection
    : undefined;
const workerConnections = new WeakMap<object, Connection>();
function currentDatabase(): Database {
  let context: CloudflareContext<Record<string, unknown>, object> | undefined;
  try {
    context = getCloudflareContext();
  } catch {
    /* Node.js and CLI scripts have no Worker context. */
  }
  if (context) {
    let connection = workerConnections.get(context.ctx);
    if (!connection) {
      const env = context.env as { DATABASE_URL?: string };
      connection = connect(env.DATABASE_URL || process.env.DATABASE_URL);
      workerConnections.set(context.ctx, connection);
      const requestPool = connection.pool;
      const requestContext = context.ctx;
      after(async () => {
        await requestPool.end();
        workerConnections.delete(requestContext);
      });
    }
    return connection.db;
  }
  nodeConnection ??= connect(process.env.DATABASE_URL);
  if (process.env.NODE_ENV !== "production")
    globalDb.vipecamConnection = nodeConnection;
  return nodeConnection.db;
}
// Resolve lazily so a build never opens a database connection or embeds credentials.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const target = currentDatabase();
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
export async function closeDatabase() {
  await nodeConnection?.pool.end();
  nodeConnection = undefined;
  delete globalDb.vipecamConnection;
}
