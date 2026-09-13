import Link from "next/link";
import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cameras, rentalItems, rentals, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getRentals } from "@/services/booking";
import { todayInVietnam } from "@/services/booking-rules";
import { money, statusLabels, dateLabel } from "@/lib/utils";
export default async function Dashboard() {
  await requireAdmin();
  const today = todayInVietnam();
  const [stock, occupied, counts, customers, recent] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${cameras.quantity}),0)::int`,
        rentable: sql<number>`coalesce(sum(case when ${cameras.isActive} and ${cameras.status} in ('AVAILABLE','RENTED') then ${cameras.quantity} else 0 end),0)::int`,
      })
      .from(cameras),
    db
      .select({
        total: sql<number>`coalesce(sum(${rentalItems.quantity}),0)::int`,
      })
      .from(rentalItems)
      .innerJoin(rentals, eq(rentals.id, rentalItems.rentalId))
      .where(
        and(
          inArray(rentals.status, ["CONFIRMED", "RENTING"]),
          lte(rentals.startDate, today),
          gte(rentals.endDate, today),
        ),
      ),
    db
      .select({
        pending: sql<number>`count(*) filter (where ${rentals.status} = 'PENDING')::int`,
        renting: sql<number>`count(*) filter (where ${rentals.status} = 'RENTING')::int`,
        revenue: sql<number>`coalesce(sum(${rentals.subtotal}) filter (where ${rentals.status} = 'COMPLETED'),0)::bigint`,
      })
      .from(rentals),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.role, "CUSTOMER")),
    getRentals(undefined, 8),
  ]);
  const stats = [
    { title: "Tổng số thiết bị", value: stock[0].total },
    { title: "Máy đã giữ lịch hôm nay", value: occupied[0].total },
    {
      title: "Máy còn trống hôm nay",
      value: Math.max(0, stock[0].rentable - occupied[0].total),
    },
    { title: "Đơn chờ xác nhận", value: counts[0].pending },
    { title: "Đơn đang thuê", value: counts[0].renting },
    {
      title: "Doanh thu đơn hoàn thành",
      value: money(Number(counts[0].revenue)),
    },
    { title: "Tổng khách hàng", value: customers[0].count },
  ];
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">TỔNG QUAN CỬA HÀNG</span>
          <h1>Dashboard</h1>
        </div>
        <Link href="/admin/rentals" className="button button-primary">
          Quản lý đơn thuê
        </Link>
      </div>
      <p className="text-muted text-sm">
        Doanh thu chỉ tính tiền thuê của đơn hoàn thành, không bao gồm tiền cọc.
      </p>
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.title}>
            <p>{s.title}</p>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <h2 className="text-xl">Đơn thuê gần đây</h2>
        <Link href="/admin/rentals">Xem tất cả →</Link>
      </div>
      {recent.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Ngày nhận</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recent.slice(0, 8).map((r) => (
                <tr key={r.id}>
                  <td>{r.rentalCode}</td>
                  <td>{r.customerName}</td>
                  <td>{dateLabel(r.startDate)}</td>
                  <td>{money(r.totalAmount)}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>
                      {statusLabels[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          Chưa có đơn thuê. Đơn mới sẽ xuất hiện tại đây.
        </div>
      )}
    </>
  );
}
