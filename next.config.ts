import type { NextConfig } from "next";
const config: NextConfig = {
  // pnpm's traced standalone symlinks fail to resolve on Windows.
  // Keep `next start` usable locally; Linux deployments retain standalone output.
  output: process.platform === "win32" ? undefined : "standalone",
  poweredByHeader: false,
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
