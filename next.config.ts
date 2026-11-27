import type { NextConfig } from "next";
const isCloudflareBuild = process.env.CLOUDFLARE_WORKER_BUILD === "1";

const config: NextConfig = {
  // Isolate the local upload-test server from the running development preview.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // pnpm's traced standalone symlinks fail to resolve on Windows.
  // Keep `next start` usable locally; Linux deployments retain standalone output.
  output: process.platform === "win32" ? undefined : "standalone",
  poweredByHeader: false,
  // When building for Cloudflare Workers, exclude local-only Node native addons
  // (sharp, node-postgres) so esbuild does not try to bundle `.node` binaries or
  // `pg-cloudflare`. On Workers, DB uses `@neondatabase/serverless` and image
  // uploads use the Cloudflare `IMAGES` binding.
  ...(isCloudflareBuild
    ? {
        turbopack: {
          resolveAlias: {
            "@/services/normalize-image-node":
              "./src/services/normalize-image-worker-stub.ts",
            pg: "./src/db/pg-worker-stub.ts",
            "drizzle-orm/node-postgres": "./src/db/pg-worker-stub.ts",
          },
        },
      }
    : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
