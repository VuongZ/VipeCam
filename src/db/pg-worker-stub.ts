export class Pool {
  constructor() {
    throw new Error(
      "TCP node-postgres Pool is only for local development; Cloudflare Workers must use Neon serverless.",
    );
  }
}

export function drizzle(): never {
  throw new Error(
    "drizzle-orm/node-postgres is only for local development; Cloudflare Workers must use Neon serverless.",
  );
}
