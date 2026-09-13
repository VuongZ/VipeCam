import { config } from "dotenv";
// Match Next.js precedence for CLI migrations, seeds and admin creation.
config({ path: [".env.local", ".env"], quiet: true });
