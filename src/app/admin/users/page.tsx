import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { UsersTable } from "@/components/admin/users-table";
export default async function Page() {
  await requireAdmin();
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.createdAt);
  return (
    <>
      <div className="admin-heading">
        <h1>Người dùng</h1>
      </div>
      <UsersTable users={users} />
    </>
  );
}
