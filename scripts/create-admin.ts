import "../src/lib/load-env";
import { hashPassword } from "better-auth/crypto";
import { db, closeDatabase } from "../src/db";
import { user, account } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
async function main() {
  const input = z
    .object({
      ADMIN_EMAIL: z.email(),
      ADMIN_PASSWORD: z.string().min(12).max(128),
      ADMIN_NAME: z.string().min(1),
    })
    .parse(process.env);
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, input.ADMIN_EMAIL));
  if (existing.length)
    throw new Error(
      "Email đã tồn tại. Dùng email mới để tránh nâng quyền nhầm tài khoản.",
    );
  const password = await hashPassword(input.ADMIN_PASSWORD);
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      email: input.ADMIN_EMAIL.toLowerCase(),
      name: input.ADMIN_NAME,
      role: "ADMIN",
    });
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password,
    });
  });
  console.log("Đã tạo tài khoản quản trị.");
}
main()
  .catch(() => {
    console.error(
      "Không tạo được admin. Cần email mới, tên và mật khẩu tối thiểu 12 ký tự trong biến môi trường.",
    );
    process.exitCode = 1;
  })
  .finally(closeDatabase);
