import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { zaloPhoneSchema } from "@/validators";
function validPhone(value: unknown) {
  const parsed = zaloPhoneSchema.safeParse(value);
  if (!parsed.success)
    throw new APIError("BAD_REQUEST", {
      message: parsed.error.issues[0].message,
    });
  return parsed.data;
}
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: process.env.BETTER_AUTH_URL,
  // The local dev server is bound to 127.0.0.1; accept both loopback names.
  trustedOrigins:
    process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : [],
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => ({
          data: {
            ...data,
            name: z.string().trim().min(1).max(250).parse(data.name),
            // Existing accounts stay nullable; all newly registered customers must supply Zalo.
            ...(data.role === "ADMIN" ? {} : { phone: validPhone(data.phone) }),
          },
        }),
      },
      update: {
        before: async (data) => ({
          data: {
            ...data,
            ...(data.name === undefined
              ? {}
              : { name: z.string().trim().min(1).max(250).parse(data.name) }),
            ...(data.phone === undefined
              ? {}
              : { phone: validPhone(data.phone) }),
          },
        }),
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CUSTOMER",
        input: false,
      },
      phone: { type: "string", required: false },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  plugins: [nextCookies()],
});
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/account");
  return user;
}
