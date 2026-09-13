"use client";
import { useState } from "react";
export function UsersTable({
  users,
}: {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  }[];
}) {
  const [q, setQ] = useState("");
  const filtered = users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="admin-toolbar">
        <input
          placeholder="Tìm tên hoặc email..."
          aria-label="Tìm người dùng"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {filtered.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge">
                      {u.role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
                    </span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("vi-VN").format(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">Chưa có người dùng phù hợp.</div>
      )}
    </>
  );
}
